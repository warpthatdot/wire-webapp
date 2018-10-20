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

// grunt test_init && grunt test_run:user/UserRepository

'use strict';

describe('z.user.UserRepository', () => {
  let userRepository;
  let connectionSettings;

  let server = null;

  beforeAll(() => {
    return new TestFactory().exposeUserActors().then(({repository, settings}) => {
      userRepository = repository.user;
      connectionSettings = settings.connection;
    });
  });

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    userRepository.users.removeAll();
    server.restore();
  });

  describe('users', () => {
    describe('fetchUserById', () => {
      it('should handle malformed input', () => {
        return userRepository
          .fetchUsersById()
          .then(response => {
            expect(response.length).toBe(0);
            return userRepository.fetchUsersById([undefined, undefined, undefined]);
          })
          .then(response => {
            expect(response.length).toBe(0);
          });
      });
    });

    describe('findUserById', () => {
      let user = null;

      beforeEach(() => {
        user = new z.entity.User(entities.user.john_doe.id);
        return userRepository.save_user(user);
      });

      afterEach(() => {
        userRepository.users.removeAll();
      });

      it('should find an existing user', () => {
        return userRepository.findUserById(user.id).then(user_et => {
          expect(user_et).toEqual(user);
        });
      });

      it('should not find an unknown user', done => {
        userRepository
          .findUserById('1')
          .then(done.fail)
          .catch(error => {
            expect(error.type).toBe(z.error.UserError.TYPE.USER_NOT_FOUND);
            done();
          });
      });
    });

    describe('save_user', () => {
      afterEach(() => userRepository.users.removeAll());

      it('saves a user', () => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        return userRepository.save_user(user).then(() => {
          expect(userRepository.users().length).toBe(1);
          expect(userRepository.users()[0]).toBe(user);
        });
      });

      it('saves self user', () => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        return userRepository.save_user(user, true).then(() => {
          expect(userRepository.users().length).toBe(1);
          expect(userRepository.users()[0]).toBe(user);
          expect(userRepository.self()).toBe(user);
        });
      });
    });

    describe('_assignAllClients', () => {
      let user_jane_roe = null;
      let user_john_doe = null;

      beforeEach(() => {
        user_jane_roe = new z.entity.User(entities.user.jane_roe.id);
        user_john_doe = new z.entity.User(entities.user.john_doe.id);

        return userRepository.save_users([user_jane_roe, user_john_doe]).then(() => {
          const clientMapper = userRepository.client_repository.clientMapper;

          const permanent_client = clientMapper.mapClient(entities.clients.john_doe.permanent);
          const plain_client = clientMapper.mapClient(entities.clients.jane_roe.plain);
          const temporary_client = clientMapper.mapClient(entities.clients.john_doe.temporary);
          const recipients = {
            [entities.user.john_doe.id]: [permanent_client, temporary_client],
            [entities.user.jane_roe.id]: [plain_client],
          };

          spyOn(userRepository.client_repository, 'getAllClientsFromDb').and.returnValue(Promise.resolve(recipients));
        });
      });

      afterEach(() => userRepository.users.removeAll());

      it('assigns all available clients to the users', () => {
        return userRepository._assignAllClients().then(() => {
          expect(userRepository.client_repository.getAllClientsFromDb).toHaveBeenCalled();
          expect(user_jane_roe.devices().length).toBe(1);
          expect(user_jane_roe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
          expect(user_john_doe.devices().length).toBe(2);
          expect(user_john_doe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
          expect(user_john_doe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
        });
      });
    });

    describe('verify_usernames', () => {
      it('resolves with username when username is not taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${connectionSettings.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames),
        ]);

        return userRepository.verify_usernames(usernames).then(_usernames => {
          expect(_usernames).toEqual(usernames);
        });
      });

      it('rejects when username is taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${connectionSettings.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify([]),
        ]);

        return userRepository.verify_usernames(usernames).then(_usernames => {
          expect(_usernames.length).toBe(0);
        });
      });
    });

    describe('verify_username', () => {
      it('resolves with username when username is not taken', () => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${connectionSettings.restUrl}/users/handles/${username}`, [404, {}, '']);

        return userRepository.verify_username(username).then(_username => {
          expect(_username).toBe(username);
        });
      });

      it('rejects when username is taken', done => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${connectionSettings.restUrl}/users/handles/${username}`, [200, {}, '']);

        userRepository
          .verify_username(username)
          .then(done.fail)
          .catch(() => done());
      });
    });
  });
});
