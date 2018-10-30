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

// grunt test_init && grunt test_run:event/EventRepository

'use strict';

async function createEncodedCiphertext(
  preKey,
  text = 'Hello, World!',
  receivingIdentity = TestFactory.cryptography_repository.cryptobox.identity
) {
  const bobEngine = new window.StoreEngine.MemoryEngine();
  await bobEngine.init('bob');

  const sender = new window.cryptobox.Cryptobox(bobEngine, 1);
  await sender.create();

  const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
  genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text(text));

  const sessionId = `from-${sender.identity.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;
  const preKeyBundle = Proteus.keys.PreKeyBundle.new(receivingIdentity.public_key, preKey);

  const cipherText = await sender.encrypt(sessionId, genericMessage.toArrayBuffer(), preKeyBundle.serialise());

  return z.util.arrayToBase64(cipherText);
}

describe('z.event.EventRepository', () => {
  let eventRepository;

  let last_notification_id = undefined;

  const websocketServiceMock = (() => {
    let websocket_handler = null;

    return {
      connect(handler) {
        return (websocket_handler = handler);
      },

      publish(payload) {
        return websocket_handler(payload);
      },
    };
  })();

  beforeAll(() => z.util.protobuf.loadProtos('ext/proto/@wireapp/protocol-messaging/messages.proto'));

  beforeEach(() => {
    return new TestFactory().exposeEventActors().then(({repository}) => {
      eventRepository = repository.event;
      eventRepository.webSocketService = websocketServiceMock;

      last_notification_id = undefined;
    });
  });

  describe('updateFromStream', () => {
    beforeEach(() => {
      spyOn(eventRepository, '_handleNotification').and.callThrough();
      spyOn(eventRepository, '_bufferWebSocketNotification').and.callThrough();
      spyOn(eventRepository, '_handleBufferedNotifications').and.callThrough();
      spyOn(eventRepository, '_handleEvent');
      spyOn(eventRepository, '_distributeEvent');

      spyOn(eventRepository.notificationService, 'getNotifications').and.callFake(() => {
        return new Promise(resolve => {
          window.setTimeout(() => {
            resolve({
              has_more: false,
              notifications: [
                {id: z.util.createRandomUuid(), payload: []},
                {id: z.util.createRandomUuid(), payload: []},
              ],
            });
          }, 10);
        });
      });

      spyOn(eventRepository.notificationService, 'getNotificationsLast').and.returnValue(
        Promise.resolve({id: z.util.createRandomUuid(), payload: [{}]})
      );

      spyOn(eventRepository.notificationService, 'getLastNotificationIdFromDb').and.callFake(() => {
        return last_notification_id
          ? Promise.resolve(last_notification_id)
          : Promise.reject(new z.error.EventError(z.error.EventError.TYPE.NO_LAST_ID));
      });

      spyOn(eventRepository.notificationService, 'saveLastNotificationIdToDb').and.returnValue(
        Promise.resolve(z.event.NotificationService.prototype.PRIMARY_KEY_LAST_NOTIFICATION)
      );
    });

    it('should fetch last notifications ID from backend if not found in storage', () => {
      const missed_events_spy = jasmine.createSpy();
      amplify.unsubscribeAll(z.event.WebApp.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, missed_events_spy);

      eventRepository.connectWebSocket();
      return eventRepository.initializeFromStream().then(() => {
        expect(eventRepository.notificationService.getLastNotificationIdFromDb).toHaveBeenCalled();
        expect(eventRepository.notificationService.getNotificationsLast).toHaveBeenCalled();
        expect(eventRepository.notificationService.getNotifications).toHaveBeenCalled();
        expect(missed_events_spy).toHaveBeenCalled();
      });
    });

    it('should buffer notifications when notification stream is not processed', () => {
      last_notification_id = z.util.createRandomUuid();
      eventRepository.connectWebSocket();
      websocketServiceMock.publish({id: z.util.createRandomUuid(), payload: []});

      expect(eventRepository._bufferWebSocketNotification).toHaveBeenCalled();
      expect(eventRepository._handleNotification).not.toHaveBeenCalled();
      expect(eventRepository.notificationHandlingState()).toBe(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
      expect(eventRepository.webSocketBuffer.length).toBe(1);
    });

    it('should handle buffered notifications after notifications stream was processed', () => {
      last_notification_id = z.util.createRandomUuid();
      const last_published_notification_id = z.util.createRandomUuid();
      eventRepository.lastNotificationId(last_notification_id);
      eventRepository.connectWebSocket();
      websocketServiceMock.publish({id: z.util.createRandomUuid(), payload: []});

      websocketServiceMock.publish({id: last_published_notification_id, payload: []});
      return eventRepository.initializeFromStream().then(() => {
        expect(eventRepository._handleBufferedNotifications).toHaveBeenCalled();
        expect(eventRepository.webSocketBuffer.length).toBe(0);
        expect(eventRepository.lastNotificationId()).toBe(last_published_notification_id);
        expect(eventRepository.notificationHandlingState()).toBe(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      });
    });
  });

  describe('_handleNotification', () => {
    last_notification_id = undefined;

    beforeEach(() => {
      last_notification_id = z.util.createRandomUuid();
      eventRepository.lastNotificationId(last_notification_id);
    });

    it('should not update last notification id if transient is true', () => {
      const notification_payload = {id: z.util.createRandomUuid(), payload: [], transient: true};

      return eventRepository._handleNotification(notification_payload).then(() => {
        expect(eventRepository.lastNotificationId()).toBe(last_notification_id);
      });
    });

    it('should update last notification id if transient is false', () => {
      const notification_payload = {id: z.util.createRandomUuid(), payload: [], transient: false};

      return eventRepository._handleNotification(notification_payload).then(() => {
        expect(eventRepository.lastNotificationId()).toBe(notification_payload.id);
      });
    });

    it('should update last notification id if transient is not present', () => {
      const notification_payload = {id: z.util.createRandomUuid(), payload: []};

      return eventRepository._handleNotification(notification_payload).then(() => {
        expect(eventRepository.lastNotificationId()).toBe(notification_payload.id);
      });
    });
  });

  describe('_handleEvent', () => {
    beforeEach(() => {
      eventRepository.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn(eventRepository.eventService, 'saveEvent').and.returnValue(Promise.resolve({data: 'dummy content'}));
      spyOn(eventRepository, '_distributeEvent');
    });

    it('should not save but distribute "user.*" events', () => {
      return eventRepository._handleEvent({type: z.event.Backend.USER.UPDATE}).then(() => {
        expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "call.*" events', () => {
      return eventRepository._handleEvent({type: z.event.Client.CALL.E_CALL}).then(() => {
        expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "conversation.create" events', () => {
      return eventRepository._handleEvent({type: z.event.Backend.CONVERSATION.CREATE}).then(() => {
        expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.rename" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T11:57:37.498Z',
        data: {name: 'Renamed'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '7.800122000b2f7cca',
        type: 'conversation.rename',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return eventRepository._handleEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-join" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:14.688Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '8.800122000b2f7d20',
        type: 'conversation.member-join',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return eventRepository._handleEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-leave" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:56.363Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '9.800122000b3d69bc',
        type: 'conversation.member-leave',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return eventRepository._handleEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.voice-channel-deactivate" (missed call) events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:09:28.294Z',
        data: {reason: 'missed'},
        from: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '16.800122000b3d4ade',
        type: 'conversation.voice-channel-deactivate',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return eventRepository._handleEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts plain decryption error events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '7f0939c8-dbd9-48f5-839e-b0ebcfffec8c',
        id: 'f518d6ff-19d3-48a0-b0c1-cc71c6e81136',
        type: 'conversation.unable-to-decrypt',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        time: '2016-08-09T12:58:49.485Z',
        error: 'Offset is outside the bounds of the DataView (17cd13b4b2a3a98)',
        errorCode: '1778 (17cd13b4b2a3a98)',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return eventRepository._handleEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
        expect(eventRepository._distributeEvent).toHaveBeenCalled();
      });
    });
  });

  describe('processEvent', () => {
    it('processes OTR events', () => {
      const text = 'Hello, this is a test!';
      const ownClientId = 'f180a823bf0d1204';

      eventRepository.clientRepository.currentClient(new z.client.ClientEntity({id: ownClientId}));
      eventRepository.cryptographyRepository.createCryptobox.and.callThrough();

      return Promise.resolve()
        .then(() => eventRepository.cryptographyRepository.createCryptobox(TestFactory.storage_service.db))
        .then(() => eventRepository.cryptographyRepository.cryptobox.get_prekey())
        .then(async preKeyBundle => {
          const ciphertext = await createEncodedCiphertext(preKeyBundle, text);
          const event = {
            conversation: 'fdc6cf1a-4e37-424e-a106-ab3d2cc5c8e0',
            data: {
              recipient: ownClientId,
              sender: '4c28652a6dd21938',
              text: ciphertext,
            },
            from: '6f88716b-1383-44da-9d57-45b51cc64d90',
            time: '2018-07-10T14:54:21.621Z',
            type: 'conversation.otr-message-add',
          };
          const source = z.event.EventRepository.SOURCE.STREAM;
          return eventRepository.processEvent(event, source);
        })
        .then(messagePayload => {
          expect(messagePayload.data.content).toBe(text);
        });
    });
  });

  describe('processEvent', () => {
    let event = undefined;
    let previously_stored_event = undefined;

    beforeEach(() => {
      event = {
        conversation: z.util.createRandomUuid(),
        data: {
          content: 'Lorem Ipsum',
          previews: [],
        },
        from: z.util.createRandomUuid(),
        id: z.util.createRandomUuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      spyOn(eventRepository.eventService, 'saveEvent').and.callFake(saved_event => Promise.resolve(saved_event));
    });

    it('saves an event with a previously not used ID', () => {
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve());

      return eventRepository.processEvent(event).then(() => {
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
      });
    });

    it('ignores an event with an ID previously used by another user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = z.util.createRandomUuid();
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return eventRepository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a non-"text message" with an ID previously used by the same user', () => {
      event.type = z.event.Client.CALL.E_CALL;
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return eventRepository
        ._handleEventSaving(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user for a non-"text message"', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.type = z.event.Client.CALL.E_CALL;
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return eventRepository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return eventRepository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message with link preview', () => {
      event.data.previews.push(1);
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return eventRepository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      event.data.previews.push(1);
      event.data.content = 'Ipsum loren';

      return eventRepository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));
      spyOn(eventRepository.eventService, 'replaceEvent').and.returnValue(Promise.resolve(previously_stored_event));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      return eventRepository.processEvent(event).then(saved_event => {
        expect(saved_event.time).toEqual(initial_time);
        expect(saved_event.time).not.toEqual(changed_time);
        expect(saved_event.primary_key).toEqual(previously_stored_event.primary_key);
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
      });
    });

    it('ignores edit message with missing associated original message', () => {
      const linkPreviewEvent = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve());
      spyOn(eventRepository.eventService, 'replaceEvent').and.returnValue(Promise.resolve());

      linkPreviewEvent.data.replacing_message_id = 'initial_message_id';

      return eventRepository
        ._handleEventSaving(linkPreviewEvent)
        .then(() => fail('Should have thrown an error'))
        .catch(error => {
          expect(eventRepository.eventService.replaceEvent).not.toHaveBeenCalled();
          expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('updates edited messages when link preview arrives', () => {
      const replacingId = 'old-replaced-message-id';
      const storedEvent = Object.assign({}, event, {
        data: Object.assign({}, event.data, {
          replacing_message_id: replacingId,
        }),
      });
      const linkPreviewEvent = Object.assign({}, event);
      spyOn(eventRepository.eventService, 'loadEvent').and.callFake((conversationId, messageId) => {
        return messageId === replacingId ? Promise.resolve() : Promise.resolve(storedEvent);
      });
      spyOn(eventRepository.eventService, 'replaceEvent').and.callFake(ev => ev);

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      return eventRepository._handleEventSaving(linkPreviewEvent).then(updatedEvent => {
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
        expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews[0]).toEqual('preview');
      });
    });

    it('updates edited messages', () => {
      const originalMessage = JSON.parse(JSON.stringify(event));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(eventRepository.eventService, 'replaceEvent').and.callFake(updates => updates);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalMessage.primary_key = 12;
      event.id = z.util.createRandomUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalMessage.id;
      event.time = changed_time;

      return eventRepository._handleEventSaving(event).then(updatedEvent => {
        expect(updatedEvent.time).toEqual(initial_time);
        expect(updatedEvent.time).not.toEqual(changed_time);
        expect(updatedEvent.data.content).toEqual('new content');
        expect(updatedEvent.primary_key).toEqual(originalMessage.primary_key);
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates link preview when edited', () => {
      const replacingId = 'replaced-message-id';
      const storedEvent = Object.assign({}, event, {
        data: Object.assign({}, event.data, {
          previews: ['preview'],
        }),
      });
      const editEvent = Object.assign({}, event);
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(storedEvent));
      spyOn(eventRepository.eventService, 'replaceEvent').and.callFake(ev => ev);

      editEvent.data.replacing_message_id = replacingId;

      return eventRepository._handleEventSaving(editEvent).then(updatedEvent => {
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
        expect(eventRepository.eventService.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews.length).toEqual(0);
      });
    });

    it('saves a conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      });

      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve());

      return eventRepository.processEvent(assetAddEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(eventRepository.eventService.saveEvent).toHaveBeenCalled();
      });
    });

    it('deletes cancelled conversation.asset-add event', () => {
      const froms = [
        // cancel from an other user
        'other-user-id',
        // cancel from the self user
        eventRepository.userRepository.self().id,
      ];

      const loadEventSpy = spyOn(eventRepository.eventService, 'loadEvent');
      const deleteEventSpy = spyOn(eventRepository.eventService, 'deleteEvent');
      const testPromises = froms.map(from => {
        const assetAddEvent = Object.assign({}, event, {
          from,
          type: z.event.Client.CONVERSATION.ASSET_ADD,
        });
        const assetCancelEvent = Object.assign({}, assetAddEvent, {
          data: {reason: z.assets.AssetUploadFailedReason.CANCELLED, status: z.assets.AssetTransferState.UPLOAD_FAILED},
          time: '2017-09-06T09:43:36.528Z',
        });

        loadEventSpy.and.returnValue(Promise.resolve(assetAddEvent));
        deleteEventSpy.and.returnValue(Promise.resolve());

        return eventRepository.processEvent(assetCancelEvent).then(savedEvent => {
          expect(savedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(eventRepository.eventService.deleteEvent).toHaveBeenCalled();
        });
      });

      return Promise.all(testPromises);
    });

    it('deletes other user failed upload for conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      });
      const assetUploadFailedEvent = Object.assign({}, assetAddEvent, {
        data: {reason: z.assets.AssetUploadFailedReason.FAILED, status: z.assets.AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(eventRepository.eventService, 'deleteEvent').and.returnValue(Promise.resolve());

      return eventRepository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(eventRepository.eventService.deleteEvent).toHaveBeenCalled();
      });
    });

    it('updates self failed upload for conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      });
      const assetUploadFailedEvent = Object.assign({}, assetAddEvent, {
        data: {reason: z.assets.AssetUploadFailedReason.FAILED, status: z.assets.AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(eventRepository.userRepository, 'self').and.returnValue({id: assetAddEvent.from});
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(eventRepository.eventService, 'updateEventAsUploadFailed').and.returnValue(
        Promise.resolve(assetUploadFailedEvent)
      );

      return eventRepository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(eventRepository.eventService.updateEventAsUploadFailed).toHaveBeenCalled();
      });
    });

    it('handles conversation.asset-add state update event', () => {
      const initialAssetEvent = Object.assign({}, event, {
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      });

      const updateStatusEvent = Object.assign({}, initialAssetEvent, {
        data: {status: z.assets.AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(eventRepository.eventService, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return eventRepository.processEvent(updateStatusEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates video when preview is received', () => {
      const initialAssetEvent = Object.assign({}, event, {
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      });

      const AssetPreviewEvent = Object.assign({}, initialAssetEvent, {
        data: {status: z.assets.AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(eventRepository.eventService, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(eventRepository.eventService, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return eventRepository.processEvent(AssetPreviewEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.preview_key).toEqual(AssetPreviewEvent.data.preview_key);
        expect(eventRepository.eventService.replaceEvent).toHaveBeenCalled();
      });
    });
  });

  describe('_handleEventValidation', () => {
    it('ignores "conversation.typing" events', () => {
      eventRepository
        ._handleEventValidation({type: z.event.Backend.CONVERSATION.TYPING})
        .then(fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
        });
    });

    it('skips outdated events arriving via notification stream', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '9fe8b359-b9e0-4624-b63c-71747664e4fa',
        time: '2016-08-05T16:18:41.820Z',
        data: {content: 'Hello', nonce: '1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '74f.800122000b2d7182',
        type: 'conversation.message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      eventRepository.lastEventDate('2017-08-05T16:18:41.820Z');

      eventRepository
        ._handleEventValidation(event, z.event.EventRepository.SOURCE.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
        });
    });
  });
});
