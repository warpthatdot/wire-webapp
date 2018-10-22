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

// grunt test_init && grunt test_run:connection/ConnectionRepository

'use strict';

describe('z.connection.ConnectionRepository', () => {
  let connectionRepository;
  let connectionSettings;
  let server;

  beforeEach(() => {
    return new TestFactory().exposeConnectionActors().then(({repository, settings}) => {
      connectionRepository = repository.connection;
      connectionSettings = settings.connection;

      server = sinon.fakeServer.create();
      server.autoRespond = true;
    });
  });

  afterEach(() => {
    connectionRepository.connectionEntities.removeAll();
    server.restore();
  });

  describe('cancelRequest', () => {
    let userEntity;

    beforeEach(() => {
      const userId = z.util.createRandomUuid();
      const connectionEntity = new z.connection.ConnectionEntity(z.util.createRandomUuid());
      connectionEntity.userId = userId;

      userEntity = new z.entity.User(userId);
      userEntity.connection(connectionEntity);

      connectionRepository.connectionEntities.push(connectionEntity);
      spyOn(connectionRepository, '_updateStatus').and.returnValue(Promise.resolve());
    });

    it('sets the connection status to cancelled', () => {
      return connectionRepository.cancelRequest(userEntity).then(() => {
        expect(connectionRepository._updateStatus).toHaveBeenCalled();
      });
    });

    it('it switches the conversation if requested', () => {
      const amplifySpy = jasmine.createSpy('conversation_show');
      amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, amplifySpy);

      return connectionRepository.cancelRequest(userEntity, new z.entity.Conversation()).then(() => {
        expect(connectionRepository._updateStatus).toHaveBeenCalled();
        expect(amplifySpy).toHaveBeenCalled();
      });
    });
  });

  describe('getConnectionByConversationId', () => {
    let firstConnectionEntity = null;
    let secondConnectionEntity = null;

    beforeEach(() => {
      firstConnectionEntity = new z.connection.ConnectionEntity();
      firstConnectionEntity.conversationId = z.util.createRandomUuid();
      connectionRepository.connectionEntities.push(firstConnectionEntity);

      secondConnectionEntity = new z.connection.ConnectionEntity();
      secondConnectionEntity.conversationId = z.util.createRandomUuid();
      connectionRepository.connectionEntities.push(secondConnectionEntity);
    });

    it('should return the expected connection for the given conversation id', () => {
      const connectionEntity = connectionRepository.getConnectionByConversationId(firstConnectionEntity.conversationId);

      expect(connectionEntity).toBe(firstConnectionEntity);
      const otherConnectionEntity = connectionRepository.getConnectionByConversationId('');

      expect(otherConnectionEntity).not.toBeDefined();
    });
  });

  describe('getConnections', () => {
    it('should return the connected users', () => {
      const userId = entities.user.jane_roe.id;
      server.respondWith('GET', `${connectionSettings.restUrl}/connections?size=500`, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.connections.get),
      ]);

      server.respondWith('GET', `${connectionSettings.restUrl}/users?ids=${userId}%2C${entities.user.jane_roe.id}`, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.users.get.many),
      ]);

      return connectionRepository.getConnections().then(() => {
        expect(connectionRepository.connectionEntities().length).toBe(2);
        const [firstConnectionEntity, secondConnectionEntity] = connectionRepository.connectionEntities();

        expect(firstConnectionEntity.status()).toEqual(z.connection.ConnectionStatus.ACCEPTED);
        expect(secondConnectionEntity.conversationId).toEqual('45c8f986-6c8f-465b-9ac9-bd5405e8c944');
      });
    });
  });
});
