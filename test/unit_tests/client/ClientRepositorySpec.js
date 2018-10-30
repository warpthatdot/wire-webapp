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

// grunt test_init && grunt test_run:client/ClientRepository

'use strict';

describe('z.client.ClientRepository', () => {
  let clientRepository;
  let connectionSettings;
  let userId = undefined;

  const clientId = '5021d77752286cac';

  beforeAll(() => {
    return new TestFactory().exposeClientActors().then(({repository, service, settings}) => {
      connectionSettings = settings.connection;

      clientRepository = repository.client;
      userId = clientRepository.selfUser().id;
    });
  });

  beforeEach(() => TestFactory.storage_repository.clearStores());

  describe('getClientsByUserId', () =>
    it('maps client entities from client payloads by the backend', () => {
      clientRepository.currentClient(new z.client.ClientEntity({id: clientId}));
      spyOn(clientRepository.clientService, 'getClientsByUserId').and.returnValue(
        Promise.resolve([
          {class: 'desktop', id: '706f64373b1bcf79'},
          {class: 'phone', id: '809fd276d6709474'},
          {class: 'desktop', id: '8e11e06549c8cf1a'},
          {class: 'tablet', id: 'c411f97b139c818b'},
          {class: 'desktop', id: 'cbf3ea49214702d8'},
        ])
      );

      return clientRepository.getClientsByUserId(entities.user.john_doe.id).then(clientEntities => {
        const [firstClientEntity] = clientEntities;

        expect(firstClientEntity instanceof z.client.ClientEntity).toBeTruthy();
        expect(Object.keys(clientEntities).length).toBe(5);
      });
    }));

  describe('getValidLocalClient', () => {
    let server = undefined;

    const clientUrl = `${connectionSettings.restUrl}/clients/${clientId}`;
    const clientPayloadServer = {
      address: '62.96.148.44',
      class: 'desktop',
      id: clientId,
      label: 'Windows 10',
      location: {
        lat: 52.5233,
        lon: 13.4138,
      },
      model: 'Wire for Windows',
      time: '2016-05-02T11:53:49.976Z',
      type: 'permanent',
    };

    const clientPayloadDatabase = clientPayloadServer;
    clientPayloadDatabase.meta = {
      is_verified: true,
      primary_key: 'local_identity',
    };

    beforeEach(() => {
      server = sinon.fakeServer.create();
      server.autoRespond = true;
    });

    afterEach(() => server.restore());

    it('resolves with a valid client', () => {
      spyOn(clientRepository.clientService, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));

      server.respondWith('GET', clientUrl, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(clientPayloadServer),
      ]);

      return clientRepository.getValidLocalClient().then(clientObservable => {
        expect(clientObservable).toBeDefined();
        expect(clientObservable().id).toBe(clientId);
      });
    });

    it('rejects with an error if no client found locally', done => {
      spyOn(clientRepository.clientService, 'loadClientFromDb').and.returnValue(
        Promise.resolve(z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT)
      );

      clientRepository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.ClientError));
          expect(error.type).toBe(z.error.ClientError.TYPE.NO_VALID_CLIENT);
          done();
        });
    });

    it('rejects with an error if client removed on backend', done => {
      spyOn(clientRepository.clientService, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));
      spyOn(clientRepository.storage_service, 'deleteDatabase').and.returnValue(Promise.resolve(true));

      clientRepository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.ClientError));
          expect(error.type).toBe(z.error.ClientError.TYPE.NO_VALID_CLIENT);
          done();
        });
    });

    it('rejects with an error if something else fails', done => {
      spyOn(clientRepository.clientService, 'loadClientFromDb').and.returnValue(
        Promise.reject(new Error('Expected unit test error'))
      );

      clientRepository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(Error));
          expect(error.type).toBe(z.error.ClientError.TYPE.DATABASE_FAILURE);
          done();
        });
    });
  });

  describe('_constructPrimaryKey', () => {
    it('returns a proper primary key for a client', () => {
      const actualPrimaryKey = clientRepository._constructPrimaryKey(userId, clientId);
      const expectedPrimaryKey = `${userId}@${clientId}`;

      expect(actualPrimaryKey).toEqual(expectedPrimaryKey);
    });

    it('throws an error if missing user ID', () => {
      const functionCall = () => clientRepository._constructPrimaryKey(undefined, clientId);

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.NO_USER_ID);
    });

    it('throws and error if missing client ID', () => {
      const functionCall = () => clientRepository._constructPrimaryKey(userId, undefined);

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.NO_CLIENT_ID);
    });
  });

  describe('isCurrentClientPermanent', () => {
    beforeEach(() => {
      z.util.Environment.electron = false;
      clientRepository.currentClient(undefined);
    });

    it('returns true on Electron', () => {
      const clientPayload = {type: z.client.ClientType.PERMANENT};
      const clientEntity = clientRepository.clientMapper.mapClient(clientPayload, true);
      clientRepository.currentClient(clientEntity);
      z.util.Environment.electron = true;
      const isPermanent = clientRepository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns true on Electron even if client is temporary', () => {
      const clientPayload = {type: z.client.ClientType.TEMPORARY};
      const clientEntity = clientRepository.clientMapper.mapClient(clientPayload, true);
      clientRepository.currentClient(clientEntity);
      z.util.Environment.electron = true;
      const isPermanent = clientRepository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('throws an error on Electron if no current client', () => {
      z.util.Environment.electron = true;
      const functionCall = () => clientRepository.isCurrentClientPermanent();

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.CLIENT_NOT_SET);
    });

    it('returns true if current client is permanent', () => {
      const clientPayload = {type: z.client.ClientType.PERMANENT};
      const clientEntity = clientRepository.clientMapper.mapClient(clientPayload, true);
      clientRepository.currentClient(clientEntity);
      const isPermanent = clientRepository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns false if current client is temporary', () => {
      const clientPayload = {type: z.client.ClientType.TEMPORARY};
      const clientEntity = clientRepository.clientMapper.mapClient(clientPayload, true);
      clientRepository.currentClient(clientEntity);
      const isPermanent = clientRepository.isCurrentClientPermanent();

      expect(isPermanent).toBeFalsy();
    });

    it('throws an error if no current client', () => {
      const functionCall = () => clientRepository.isCurrentClientPermanent();

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.CLIENT_NOT_SET);
    });
  });

  describe('_isCurrentClient', () => {
    beforeEach(() => clientRepository.currentClient(undefined));

    it('returns true if user ID and client ID match', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      clientRepository.currentClient(clientEntity);
      clientRepository.selfUser(new z.entity.User(userId));
      const result = clientRepository._isCurrentClient(userId, clientId);

      expect(result).toBeTruthy();
    });

    it('returns false if only the user ID matches', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      clientRepository.currentClient(clientEntity);
      const result = clientRepository._isCurrentClient(userId, 'ABCDE');

      expect(result).toBeFalsy();
    });

    it('returns false if only the client ID matches', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      clientRepository.currentClient(clientEntity);
      const result = clientRepository._isCurrentClient('ABCDE', clientId);

      expect(result).toBeFalsy();
    });

    it('throws an error if current client is not set', () => {
      const functionCall = () => clientRepository._isCurrentClient(userId, clientId);

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.CLIENT_NOT_SET);
    });

    it('throws an error if client ID is not specified', () => {
      clientRepository.currentClient(new z.client.ClientEntity());
      const functionCall = () => clientRepository._isCurrentClient(userId);

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.NO_CLIENT_ID);
    });

    it('throws an error if user ID is not specified', () => {
      clientRepository.currentClient(new z.client.ClientEntity());
      const functionCall = () => clientRepository._isCurrentClient(undefined, clientId);

      expect(functionCall).toThrowError(z.error.ClientError, z.error.ClientError.MESSAGE.NO_USER_ID);
    });
  });
});
