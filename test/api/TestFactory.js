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

/* eslint no-undef: "off" */

'use strict';

class TestFactory {
  /**
   * Construct a TestFactory.
   *
   * @constructor
   * @param {function} [loggerLevel =  z.util.Logger.prototype.levels.OFF] - A function returning the logger level.
   * @returns {TestFactory} TestFactory instance.
   */
  constructor(loggerLevel = z.util.Logger.prototype.levels.OFF) {
    this.repository = {};
    this.service = {};

    this.settings = {
      connection: {
        environment: 'test',
        restUrl: 'http://localhost',
        websocket_url: 'wss://localhost',
      },
    };

    Object.keys(z.config.LOGGER.OPTIONS.domains).forEach(domain => {
      z.config.LOGGER.OPTIONS.domains[domain] = loggerLevel;
    });
    z.config.LOGGER.OPTIONS.level = loggerLevel;

    this.backendClient = new z.service.BackendClient(this.settings.connection);
    this.logger = new z.util.Logger('TestFactory', z.config.LOGGER.OPTIONS);
  }

  /**
   * Expose audio related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeAudioActors() {
    if (this.repository.audio) {
      return Promise.resolve(this);
    }

    return Promise.resolve().then(() => {
      this.repository.audio = new z.audio.AudioRepository();

      this.logger.info('✓ instantiated audio Actors');
      return this;
    });
  }

  /**
   * Expose authentication actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeAuthActors() {
    if (this.repository.auth) {
      return Promise.resolve(this);
    }

    return Promise.resolve().then(() => {
      this.service.auth = new z.auth.AuthService(this.backendClient);
      this.repository.auth = new z.auth.AuthRepository(this.service.auth);

      this.logger.info('✓ instantiated auth actors');
      return this;
    });
  }

  /**
   * Expose backup actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeBackupActors() {
    if (this.repository.backup) {
      return Promise.resolve(this);
    }

    return this.exposeClientActors()
      .then(() => this.exposeConversationActors())
      .then(() => this.exposeUserActors())
      .then(() => this.exposeStorageActors())
      .then(() => {
        this.service.backup = new z.backup.BackupService(this.service.storage);
        this.repository.backup = new z.backup.BackupRepository(
          this.service.backup,
          this.repository.client,
          this.repository.conversation,
          this.repository.user
        );

        this.logger.info('✓ instantiated backup Actors');
        return this;
      });
  }

  /**
   * Expose cachce related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeCacheActors() {
    if (this.repository.cache) {
      return Promise.resolve(this);
    }

    return Promise.resolve().then(() => {
      this.repository.cache = new z.cache.CacheRepository();

      this.logger.info('✓ instantiated cache Actors');
      return this;
    });
  }

  /**
   * Expose calling actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeCallingActors() {
    if (this.repository.calling) {
      return Promise.resolve(this);
    }

    return this.exposeClientActors()
      .then(() => this.exposeConversationActors())
      .then(() => this.exposeEventActors())
      .then(() => this.exposeMediaActors())
      .then(() => this.exposeUserActors())
      .then(() => {
        this.service.calling = new z.calling.CallingService(this.backendClient);

        this.repository.calling = new z.calling.CallingRepository(
          this.servicecalling,
          this.repository.client,
          this.repository.conversation,
          this.repository.event,
          this.repository.media,
          this.repository.user
        );
        this.repository.calling.callLogger.level = this.settings.loggingLevel;

        this.logger.info('✓ instantiated calling Actors');
        return this;
      });
  }

  /**
   * Expose client actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeClientActors() {
    if (this.repository.client) {
      return Promise.resolve(this);
    }

    return this.exposeCryptographyActors().then(() => {
      this.service.client = new z.client.ClientService(this.backendClient, this.service.storage);
      this.repository.client = new z.client.ClientRepository(this.service.client, this.repository.cryptography);

      const temporaryclientData = entities.clients.john_doe.temporary;
      const temporaryClientEntity = new z.client.ClientEntity(temporaryclientData);

      const userData = entities.user.john_doe;
      const userEntity = new z.entity.User(userData.id);

      userEntity.devices.push(temporaryClientEntity);
      userEntity.email(userData.email);
      userEntity.is_me = true;
      userEntity.locale = userData.locale;
      userEntity.name(userData.name);
      userEntity.phone(userData.phone);

      this.repository.client.init(userEntity);

      const permanentClientData = entities.clients.john_doe.permanent;
      const permanentClientEntity = new z.client.ClientEntity(permanentClientData);
      this.repository.client.currentClient(permanentClientEntity);

      this.logger.info('✓ instantiated client Actors');
      return this;
    });
  }

  /**
   * Expose connect actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeConnectActors() {
    if (this.repository.connect) {
      return Promise.resolve(this);
    }

    return this.exposeUserActors().then(() => {
      this.service.connect = new z.connect.ConnectService(this.backendClient);
      this.service.connectGoogle = new z.connect.ConnectGoogleService();

      this.repository.connect = new z.connect.ConnectRepository(
        this.service.connect,
        this.service.connectGoogle,
        this.repository.user
      );

      this.logger.info('✓ instantiated connect actors');
      return this;
    });
  }

  /**
   * Expose connection actors.
   * @returns {Promise<z.connection.ConnectionRepository>} Promise that resolves with the TestFactory instance.
   */
  exposeConnectionActors() {
    if (this.repository.connection) {
      return Promise.resolve(this);
    }

    return this.exposeUserActors().then(() => {
      this.service.connection = new z.connection.ConnectionService(this.backendClient);
      this.repository.connection = new z.connection.ConnectionRepository(this.service.connection, this.repository.user);

      this.logger.info('✓ instantiated connection actors');
      return this;
    });
  }

  /**
   * Expose conversation actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeConversationActors() {
    if (this.repository.conversation) {
      return Promise.resolve(this);
    }

    return this.exposeClientActors()
      .then(() => this.exposeCryptographyActors())
      .then(() => this.exposeEventActors())
      .then(() => this.exposeServerActors())
      .then(() => this.exposeTeamActors())
      .then(() => this.exposeUserActors())
      .then(() => {
        this.service.conversation = new z.conversation.ConversationService(
          this.backendClient,
          this.service.event,
          this.service.storage
        );

        this.repository.conversation = new z.conversation.ConversationRepository(
          this.service.conversation,
          this.service.asset,
          this.repository.client,
          this.repository.cryptography,
          this.repository.event,
          undefined, //Giphy repository
          undefined, //Link repository
          this.repository.serverTime,
          this.repository.team,
          this.repository.user
        );

        this.logger.info('✓ instantiated conversation actors');
        return this;
      });
  }

  /**
   * Expose cryptobox actors.
   * @param {boolean} skipCryptobox - Skip cryptobox initialization (cryptobox initialization is a very costy operation)
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeCryptographyActors(skipCryptobox = true) {
    if (this.repository.cryptography) {
      return Promise.resolve(this);
    }

    return this.exposeClientActors()
      .then(() => this.exposeStorageActors())
      .then(() => {
        this.service.cryptography = new z.cryptography.CryptographyService(this.backendClient);

        this.repository.cryptography = new z.cryptography.CryptographyRepository(
          this.service.cryptography,
          this.repository.storage
        );

        this.repository.cryptography.currentClient = this.repository.client.currentClient;

        if (!skipCryptobox) {
          return this.repository.cryptography.createCryptobox(this.service.storage.db);
        }
      })
      .then(() => {
        this.logger.info('✓ instantiated cryptography actors');
        return this;
      });
  }

  /**
   * Expose event actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeEventActors() {
    if (this.repository.event) {
      return Promise.resolve(this);
    }

    return this.exposeConversationActors()
      .then(() => this.exposeCryptographyActors())
      .then(() => this.exposeUserActors())
      .then(() => {
        this.service.webSocket = new z.event.WebSocketService(this.backendClient, this.service.storage);
        this.service.event = new z.event.EventService(this.service.storage);
        this.service.eventNoCompound = new z.event.EventServiceNoCompound(this.service.storage);
        this.service.notification = new z.event.NotificationService(this.backendClient, this.service.storage);

        this.repository.event = new z.event.EventRepository(
          this.service.event,
          this.service.notification,
          this.service.web_socket,
          this.service.conversation,
          this.repository.cryptography,
          this.repository.serverTime,
          this.repository.user
        );
        this.repository.event.currentClient = this.repository.cryptography.currentClient;

        this.logger.info('✓ instantiated event actors');
        return this;
      });
  }

  /**
   * Expose lifecycle related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeLifecycleActors() {
    if (this.repository.lifecycle) {
      return Promise.resolve(this);
    }

    return this.exposeUserActors().then(() => {
      this.service.lifecycle = new z.lifecycle.LifecycleService();
      this.reposirory.lifecycle = new z.lifecycle.LifecycleRepository(this.service.lifecycle, this.repository.user);

      this.logger.info('✓ instantiated lifecycle actors');
      return this;
    });
  }

  /**
   * Expose media related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeMediaActors() {
    if (this.repository.media) {
      return Promise.resolve(this);
    }

    return Promise.exposeAudioActors().then(() => {
      this.repository.media = new z.media.MediaRepository(this.repository.audio);

      this.logger.info('✓ instantiated media actors');
      return this;
    });
  }

  /**
   * Expose notification related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeNotificationActors() {
    if (this.repository.notification) {
      return Promise.resolve(this);
    }

    return this.exposeCallingActors()
      .then(() => this.exposeConversationActors())
      .then(() => this.exposePermissionActors())
      .then(() => this.exposeUserActors())
      .then(() => {
        this.repository.notification = new z.notification.NotificationRepository(
          this.repository.calling,
          this.repository.conversation,
          this.repository.permission,
          this.repository.user
        );

        this.logger.info('✓ instantiated notification actors');
        return this;
      });
  }

  /**
   * Expose permission related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposePermissionActors() {
    if (this.repository.permission) {
      return Promise.resolve(this);
    }

    return Promise.resolve().then(() => {
      this.repository.permission = new z.permission.PermissionRepository();

      this.logger.info('✓ instantiated permission actors');
      return this;
    });
  }

  /**
   * Expose search related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeSearchActors() {
    if (this.repository.search) {
      return Promise.resolve(this);
    }

    return Promise.exposeUserActors().then(() => {
      this.service.search = new z.search.SearchService(this.backendClient);
      this.repository.search = new z.search.SearchRepository(this.service.search, this.repository.user);

      this.logger.info('✓ instantiated search actors');
      return this;
    });
  }

  /**
   * Expose server related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeServerActors() {
    if (this.repository.serverTime) {
      return Promise.resolve(this);
    }

    return Promise.resolve().then(() => {
      this.repository.serverTime = new z.time.ServerTimeRepository();

      this.logger.info('✓ instantiated server actors');
      return this;
    });
  }

  /**
   * Expose team related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeTeamActors() {
    if (this.repository.team) {
      return Promise.resolve(this);
    }

    return this.exposeUserActors().then(() => {
      this.service.team = new z.team.TeamService(this.backendClient);
      this.repository.team = new z.team.TeamRepository(this.service.team, this.repository.user);

      this.logger.info('✓ instantiated team actors');
      return this;
    });
  }

  /**
   * Expose storage related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeStorageActors() {
    if (this.repository.storage) {
      return Promise.resolve(this);
    }

    return Promise.resolve()
      .then(() => {
        this.service.storage = new z.storage.StorageService();
        this.repository.storage = new z.storage.StorageRepository(this.service.storage);

        return TestFactory.storage_service.init(z.util.createRandomUuid());
      })
      .then(() => {
        this.logger.info('✓ instantiated storage actors');
        return this;
      });
  }

  /**
   * Expose tracking related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeTrackingActors() {
    if (this.repository.tracking) {
      return Promise.resolve(this);
    }

    return this.exposeTeamActors()
      .then(() => this.exposeUserActors())
      .then(() => {
        this.repository.tracking = new z.tracking.EventTrackingRepository(this.repository.team, this.repository.user);

        this.logger.info('✓ instantiated tracking actors');
        return this;
      });
  }

  /**
   * Expose user related actors.
   * @returns {Promise<TestFactory>} Promise that resolves with the TestFactory instance.
   */
  exposeUserActors() {
    if (this.repository.user) {
      return Promise.resolve(this);
    }

    return this.exposeClientActors()
      .then(() => this.exposeServerActors())
      .then(() => {
        this.service.asset = new z.assets.AssetService(this.backendClient);
        this.service.connection = new z.connection.ConnectionService(this.backendClient);
        this.service.self = new z.self.SelfService(this.backendClient);
        this.service.user = new z.user.UserService(this.backendClient);

        this.repository.user = new z.user.UserRepository(
          this.service.user,
          this.service.asset,
          this.service.connection,
          this.service.self,
          this.repository.client,
          this.repository.serverTime
        );
        this.repository.user.save_user(this.repository.client.selfUser(), true);

        this.logger.info('✓ instantiated user actors');
        return this;
      });
  }
}

window.TestFactory = new TestFactory();
