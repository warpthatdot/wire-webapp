/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

window.z = window.z || {};
window.z.self = z.self || {};

z.self.SelfRepository = class SelfRepository {
  static get CONFIG() {
    return {
      MINIMUM_NAME_LENGTH: 2,
      MINIMUM_PICTURE_SIZE: {
        HEIGHT: 320,
        WIDTH: 320,
      },
      MINIMUM_USERNAME_LENGTH: 2,
      SUPPORTED_EVENTS: [z.event.Backend.USER.DELETE, z.event.Backend.USER.UPDATE],
    };
  }

  /**
   * Construct a new Self repository.
   * @class z.self.SelfRepository
   * @param {z.self.SelfService} selfService - Backend REST API self service implementation
   * @param {z.assets.AssetService} assetService - Backend REST API asset service implementation
   */
  constructor(selfService, assetService) {
    this.selfService = selfService;
    this.assetService = assetService;
    this.logger = new z.util.Logger('z.user.UserRepository', z.config.LOGGER.OPTIONS);

    this.userMapper = new z.user.UserMapper();
    this.shouldSetUsername = false;

    this.selfUser = ko.observable();

    this.isActivatedAccount = ko.pureComputed(() => this.selfUser() && !this.selfUser().isTemporaryGuest());
    this.isTemporaryGuest = ko.pureComputed(() => this.selfUser() && this.selfUser().isTemporaryGuest());
    this.isProAccount = ko.pureComputed(() => this.selfUser() && this.selfUser().inTeam());

    this.marketingConsent = ko.observable(false);

    amplify.subscribe(z.event.WebApp.USER.SET_AVAILABILITY, this.setAvailability.bind(this));
    amplify.subscribe(z.event.WebApp.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  /**
   * Listener for incoming user events.
   *
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onUserEvent(eventJson, source) {
    const {type} = eventJson;

    const isSupportedEvent = SelfRepository.CONFIG.SUPPORTED_EVENTS.includes(type);

    if (isSupportedEvent) {
      const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
      this.logger.info(`»» User Event: '${type}' (Source: ${source})`, logObject);

      const isUserDeletion = type === z.event.Backend.USER.DELETE;
      if (isUserDeletion) {
        return this.onUserDelete(eventJson);
      }

      const isUserUpdate = type === z.event.Backend.USER.UPDATE;
      if (isUserUpdate) {
        return this.onUserUpdate(eventJson);
      }
    }
  }

  /**
   * Event to delete the matching user.
   * @param {string} id - User ID of deleted user
   * @returns {undefined} No return value
   */
  onUserDelete({id}) {
    const isSelfUser = id === this.selfUser().id;
    if (isSelfUser) {
      window.setTimeout(() => {
        amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
  }

  /**
   * Event to update the matching user.
   * @param {Object} user - Update user info
   * @returns {Promise} Resolves wit the updated user entity
   */
  onUserUpdate({user: userData}) {
    const isSelfUser = userData.id === this.selfUser().id;
    if (isSelfUser) {
      this.userMapper.updateUserFromObject(this.selfUser(), userData);
      amplify.publish(z.event.WebApp.TEAM.UPDATE_INFO);
      return this.selfUser();
    }
  }

  /**
   * Change the accent color.
   * @param {number} accentId - New accent color
   * @returns {Promise} Resolves when accent color was changed
   */
  changeAccentColor(accentId) {
    return this.selfService
      .putSelf({accentId})
      .then(() => this.user_update({user: {accent_id: accentId, id: this.selfUser().id}}));
  }

  changeMarketingConsent(consentGiven) {
    const consentValue = consentGiven ? z.user.ConsentValue.GIVEN : z.user.ConsentValue.NOT_GIVEN;
    return this.setConsent(z.user.ConsentType.MARKETING, consentValue).then(() => {
      this.logger.log(`Marketing consent updated to ${consentValue}`);
      this.marketingConsent(consentGiven);
    });
  }

  /**
   * Change name.
   * @param {string} name - New name
   * @returns {Promise} Resolves when the name was changed
   */
  changeName(name) {
    const nameTooShort = name.length < SelfRepository.CONFIG.MINIMUM_NAME_LENGTH;
    return nameTooShort
      ? Promise.reject(new z.error.UserError(z.userUserError.TYPE.INVALID_UPDATE))
      : this.selfService.putSelf({name}).then(() => this.user_update({user: {id: this.selfUser().id, name: name}}));
  }

  /**
   * Change password.
   *
   * @param {string} newPassword - New password
   * @param {string} [currentPassword] - Current password to allow change
   * @returns {Promise} Resolves when the password was changed
   */
  changePassword(newPassword, currentPassword) {
    return this.selfService.putSelfPassword(newPassword, currentPassword);
  }

  /**
   * Change email.
   * @param {string} email - Email address
   * @returns {Promise} Resolves when the email addres was set
   */
  changeEmail(email) {
    return this.selfService.putSelfEmail(email);
  }

  /**
   * Change the profile image.
   * @param {string|Object} picture - New user picture
   * @returns {Promise} Resolves when the picture was updated
   */
  changePicture(picture) {
    return this.asset_service
      .uploadProfileImage(picture)
      .then(({previewImageKey, mediumImageKey}) => {
        const assets = [
          {key: previewImageKey, size: 'preview', type: 'image'},
          {key: mediumImageKey, size: 'complete', type: 'image'},
        ];
        return this.selfService
          .putSelf({assets, picture: []})
          .then(() => this.user_update({user: {assets, id: this.selfUser().id}}));
      })
      .catch(error => {
        throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
      });
  }

  /**
   * Change username.
   * @param {string} username - New username
   * @returns {Promise} Resolves when the username was changed
   */
  changeUsername(username) {
    const usernameTooShort = username.length < SelfRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    if (usernameTooShort) {
      return Promise.reject(new z.error.UserError(z.userUserError.TYPE.INVALID_UPDATE));
    }

    return this.selfService
      .putSelfHandle(username)
      .then(() => {
        this.should_set_username = false;
        return this.user_update({user: {handle: username, id: this.selfUser().id}});
      })
      .catch(({code: error_code}) => {
        const usernameTakenErrors = [
          z.error.BackendClientError.STATUS_CODE.CONFLICT,
          z.error.BackendClientError.STATUS_CODE.BAD_REQUEST,
        ];
        if (usernameTakenErrors.includes(error_code)) {
          throw new z.error.UserError(z.error.UserError.TYPE.USERNAME_TAKEN);
        }
        throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
      });
  }

  /**
   * Request account deletion.
   * @returns {Promise} Promise that resolves when account deletion process has been initiated
   */
  deleteSelf() {
    return this.selfService
      .deleteSelf()
      .then(() => this.logger.info('Account deletion initiated'))
      .catch(error => this.logger.error(`Unable to delete self: ${error}`));
  }

  getMarketingConsent() {
    return this.selfService
      .getSelfConsent()
      .then(consents => {
        for (const {type: consentType, value: consentValue} of consents) {
          const isMarketingConsent = consentType === z.user.ConsentType.MARKETING;
          if (isMarketingConsent) {
            const hasGivenConsent = consentValue === z.user.ConsentValue.GIVEN;
            this.marketingConsent(hasGivenConsent);
            this.marketingConsent.subscribe(changedConsentValue => this.changeMarketingConsent(changedConsentValue));

            this.logger.log(`Marketing consent retrieved as '${consentValue}'`);
            return;
          }
        }

        this.logger.log(`Marketing consent not set. Defaulting to '${this.marketingConsent()}'`);
      })
      .catch(error => {
        this.logger.warn(`Failed to retrieve marketing consent: ${error.message || error.code}`, error);
      });
  }

  /**
   * Get self user from backend.
   * @returns {Promise} Promise that will resolve with the self user entity
   */
  getSelf() {
    return this.selfService
      .getSelf()
      .then(userData => this._upgradePictureAsset(userData))
      .then(response => this.user_mapper.map_self_user_from_object(response))
      .then(userEntity => {
        const promises = [this.getMarketingConsent(), this.setSelfUser(userEntity)];
        return Promise.all(promises).then(() => userEntity);
      })
      .catch(error => {
        this.logger.error(`Unable to load self user: ${error.message || error}`, [error]);
        throw error;
      });
  }

  /**
   * Detects if the user has a profile picture that uses the outdated picture API.
   * Will migrate the picture to the newer assets API if so.
   *
   * @param {Object} userData - user data from the backend
   * @returns {void}
   */
  _upgradePictureAsset(userData) {
    const hasPicture = userData.picture.length;
    const hasAsset = userData.assets.length;

    if (hasPicture) {
      if (!hasAsset) {
        // if there are no assets, just upload the old picture to the new api
        const {medium} = z.assets.AssetMapper.mapProfileAssetsV1(userData.id, userData.picture);
        medium.load().then(imageBlob => this.change_picture(imageBlob));
      } else {
        // if an asset is already there, remove the pointer to the old picture
        this.selfService.putSelf({picture: []});
      }
    }
    return userData;
  }

  /**
   * Is the user the logged in user.
   * @param {z.entity.User|string} user_id - User entity or user ID
   * @returns {boolean} Is the user the logged in user
   */
  is_me(user_id) {
    if (!_.isString(user_id)) {
      user_id = user_id.id;
    }
    return this.selfUSer().id === user_id;
  }

  /**
   * Is the user the logged in user.
   * @param {z.entity.User|string} userEntity - Self user entity
   * @returns {z.entity.User} Self user entity
   */
  setSelfUser(userEntity) {
    if (this.selfUser()) {
      // @todo throw SelfError
      throw new Error('Self User already set');
    }

    userEntity.is_me = true;
    this.selfUser(userEntity);

    /* @todo Push user to user repo
     easier to create an all users computed from self and users
     */

    return userEntity;
  }

  setAvailability(availability, method) {
    const currentAvailability = this.selfUser().availability();
    const hasAvailabilityChanged = availability !== currentAvailability;

    const newAvailabilityValue = z.user.AvailabilityMapper.valueFromType(availability);
    if (hasAvailabilityChanged) {
      const oldAvailabilityValue = z.user.AvailabilityMapper.valueFromType(currentAvailability);
      this.logger.log(`Availability was changed from '${oldAvailabilityValue}' to '${newAvailabilityValue}'`);

      this.selfUser().availability(availability);
      this._trackAvailability(availability, method);
    } else {
      this.logger.log(`Availability was again set to '${newAvailabilityValue}'`);
    }

    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoAvailability = new z.proto.Availability(z.user.AvailabilityMapper.protoFromType(availability));
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.AVAILABILITY, protoAvailability);

    amplify.publish(z.event.WebApp.BROADCAST.SEND_MESSAGE, genericMessage);
  }

  /**
   * Track availability action.
   *
   * @param {z.user.AvailabilityType} availability - Type of availability
   * @param {string} method - Method used for availability change
   * @returns {undefined} No return value
   */
  _trackAvailability(availability, method) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.CHANGED_STATUS, {
      method: method,
      status: z.user.AvailabilityMapper.valueFromType(availability),
    });
  }

  setConsent(consentType, consentValue) {
    return this.selfService.putSelfConsent(consentType, consentValue, `Webapp ${z.util.Environment.version(false)}`);
  }

  /**
   * Set users default profile image.
   * @returns {undefined} No return value
   */
  setDefaultPicture() {
    return z.util.loadUrlBlob(z.config.UNSPLASH_URL).then(blob => this.change_picture(blob));
  }

  /**
   * Whether the user needs to set a username.
   * @returns {boolean} True, if username should be changed.
   */
  shouldChangeUsername() {
    return this.shouldSetUsername;
  }
};
