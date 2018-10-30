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

// grunt test_init && grunt test_run:connect/ConnectGoogleService

'use strict';

describe('z.connect.ConnectGoogleService', () => {
  let connectGoogleService;

  beforeAll(() => {
    return new TestFactory().exposeConnectActors().then(({service}) => {
      connectGoogleService = service.connectGoogle;
    });
  });

  describe('getContacts', () => {
    beforeEach(() => {
      spyOn(connectGoogleService, '_initLibrary').and.callThrough();
      spyOn(connectGoogleService, '_loadLibrary').and.returnValue(Promise.resolve());
      spyOn(connectGoogleService, '_getContacts').and.returnValue(Promise.resolve());
    });

    it('initializes the authentication library if previously was not', () => {
      spyOn(connectGoogleService, '_getAccessToken').and.returnValue(Promise.resolve());

      return connectGoogleService.getContacts().then(() => {
        expect(connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(connectGoogleService._loadLibrary).toHaveBeenCalled();
        expect(connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });

    it('it requests an access token if none has been set', () => {
      window.gapi = {
        auth: {
          getToken() {
            return false;
          },
        },
      };

      spyOn(connectGoogleService, '_getAccessToken').and.callThrough();
      spyOn(window.gapi.auth, 'getToken').and.callThrough();
      spyOn(connectGoogleService, '_authenticate').and.returnValue(Promise.resolve());

      return connectGoogleService.getContacts().then(() => {
        expect(connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(connectGoogleService._loadLibrary).not.toHaveBeenCalled();
        expect(connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(window.gapi.auth.getToken).toHaveBeenCalled();
        expect(connectGoogleService._authenticate).toHaveBeenCalled();
        expect(connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });

    it('it uses an available access token to request contacts', () => {
      window.gapi = {
        auth: {
          getToken() {
            return {accessToken: 'accessToken'};
          },
        },
      };

      spyOn(connectGoogleService, '_getAccessToken').and.callThrough();
      spyOn(window.gapi.auth, 'getToken').and.callThrough();
      spyOn(connectGoogleService, '_authenticate');

      return connectGoogleService.getContacts().then(() => {
        expect(connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(connectGoogleService._loadLibrary).not.toHaveBeenCalled();
        expect(connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(window.gapi.auth.getToken).toHaveBeenCalled();
        expect(connectGoogleService._authenticate).not.toHaveBeenCalled();
        expect(connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });
  });
});
