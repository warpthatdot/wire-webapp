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
/* eslint-disable */
'use strict';

// grunt test_init && grunt test_run:media/MediaDevicesHandler

describe('z.media.MediaDevicesHandler', () => {
  let mediaDevicesHandler;

  const screens = [{id: 'screen1', name: 'Screen 1'}, {id: 'screen2', name: 'Screen 2'}];
  const cameras = [{deviceId: 'camera1', label: 'Camera 1'}, {deviceId: 'camera2', label: 'Camera 2'}];

  beforeAll(() => {
    return new TestFactory().exposeMediaActors().then(({repository}) => {
      const mediaRepository = repository.media;
      mediaDevicesHandler = mediaRepository.devicesHandler;
    });
  });

  beforeEach(() => {
    spyOn(mediaDevicesHandler, 'getScreenSources').and.callFake(() => {
      mediaDevicesHandler.availableDevices.screenInput(screens);
      return Promise.resolve();
    });
    spyOn(mediaDevicesHandler, 'getMediaDevices').and.callFake(() => {
      mediaDevicesHandler.availableDevices.videoInput(cameras);
      return Promise.resolve();
    });
  });

  describe('toggleNextScreen', () => {
    it('returns second screen if the first is currently selected', () => {
      mediaDevicesHandler.currentDeviceId.screenInput(screens[0].id);
      mediaDevicesHandler.currentDeviceIndex.screenInput(0);
      mediaDevicesHandler.toggleNextScreen().then(() => {
        expect(mediaDevicesHandler.currentDeviceId.screenInput()).toEqual(screens[1].id);
      });
    });
    it('returns first screen if the second is currently selected', () => {
      mediaDevicesHandler.currentDeviceId.screenInput(screens[1].id);
      mediaDevicesHandler.currentDeviceIndex.screenInput(1);
      mediaDevicesHandler.toggleNextScreen().then(() => {
        expect(mediaDevicesHandler.currentDeviceId.screenInput()).toEqual(screens[0].id);
      });
    });
  });

  describe('toggleNextCamera', () => {
    it('returns second camera if the first is currently selected', () => {
      mediaDevicesHandler.currentDeviceId.videoInput(cameras[0].deviceId);
      mediaDevicesHandler.toggleNextCamera().then(() => {
        expect(mediaDevicesHandler.currentDeviceId.videoInput()).toEqual(cameras[1].deviceId);
      });
    });
    it('returns first camera if the second is currently selected', () => {
      mediaDevicesHandler.currentDeviceId.videoInput(cameras[1].deviceId);
      mediaDevicesHandler.toggleNextCamera().then(() => {
        expect(mediaDevicesHandler.currentDeviceId.videoInput()).toEqual(cameras[0].deviceId);
      });
    });
  });
});
