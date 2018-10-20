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

// grunt test_init && grunt test_run:audio/AudioRepository

'use strict';

describe('z.audio.AudioRepository', () => {
  let audioRepository;

  beforeAll(() => {
    return new TestFactory().exposeAudioActors().then(({repository}) => {
      audioRepository = repository.audio;
      audioRepository.init(true);
    });
  });

  describe('_checkSoundSetting', () => {
    beforeAll(() => audioRepository.audioPreference(z.audio.AudioPreference.SOME));

    it('plays a sound that should be played', () => {
      audioRepository._checkSoundSetting(z.audio.AudioType.NETWORK_INTERRUPTION);
    });

    it('ignores a sound that should not be played', done => {
      return audioRepository
        ._checkSoundSetting(z.audio.AudioType.ALERT)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.IGNORED_SOUND);
          done();
        });
    });
  });

  describe('_getSoundById', () => {
    it('finds an available sound', () => {
      return audioRepository._getSoundById(z.audio.AudioType.NETWORK_INTERRUPTION).then(audio_element => {
        expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
      });
    });

    it('handles a missing sound', done => {
      return audioRepository
        ._getSoundById('foo')
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
          done();
        });
    });
  });

  describe('_play', () => {
    beforeEach(() => {
      const audioElement = new Audio(`/audio/${z.audio.AudioType.OUTGOING_CALL}.mp3`);

      audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL] = audioElement;
      spyOn(audioElement, 'play').and.returnValue(Promise.resolve());
    });

    it('plays an available sound', () => {
      const elementToPlay = audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL];
      return audioRepository._play(z.audio.AudioType.OUTGOING_CALL, elementToPlay, false).then(audioElement => {
        expect(audioElement).toEqual(jasmine.any(HTMLAudioElement));
        expect(audioElement.loop).toBeFalsy();
        expect(audioElement.play).toHaveBeenCalled();
      });
    });

    it('plays an available sound in loop', () => {
      const elementToPlay = audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL];
      return audioRepository._play(z.audio.AudioType.OUTGOING_CALL, elementToPlay, true).then(audioElement => {
        expect(audioElement).toEqual(jasmine.any(HTMLAudioElement));
        expect(audioElement.loop).toBeTruthy();
      });
    });

    it('does not play a sound twice concurrently', done => {
      const elementToPlay = audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL];
      spyOnProperty(elementToPlay, 'paused', 'get').and.returnValue(false);
      return audioRepository
        ._play(z.audio.AudioType.OUTGOING_CALL, elementToPlay)
        .then(() => done.fail('should throw an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.ALREADY_PLAYING);
          done();
        });
    });

    it('handles a missing audio id sound', done => {
      const elementToPlay = audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL];
      return audioRepository
        ._play(undefined, elementToPlay)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
          done();
        });
    });

    it('handles a missing audio element', done => {
      return audioRepository
        ._play(z.audio.AudioType.OUTGOING_CALL, undefined)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
          done();
        });
    });
  });
});
