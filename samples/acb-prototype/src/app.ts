/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Actor,
    ActorTransform,
    AnimationEaseCurves,
    AnimationKeyframe,
    AnimationWrapMode,
    AssetManager,
    ButtonBehavior,
    Context,
    ForwardPromise,
    Quaternion,
    Sound,
    SoundInstance,
    TextAnchorLocation,
    Vector3,
    Vector3Like
} from '@microsoft/mixed-reality-extension-sdk';

import { deflateSync } from 'zlib';
import delay from './utils/delay';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
    private text: Actor = null;
    private cubePlay: Actor = null;
    private cubeNext: Actor = null;
    private cubeLast: Actor = null;
    private buttonScale = { x: 0.09, y: 0.09, z: 0.09 };
    private buttonPlayState = false;
    private trackIndex = 0;
    private trackSoundInstance: ForwardPromise<SoundInstance> = null;
    private songDurationTracker: Promise<void> = null;
    private tracks: Array<ForwardPromise<Sound>> = [];

    constructor(private context: Context, private baseUrl: string) {
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private started() {

        // Load a glTF model
        const buttonPromisePlay = Actor.CreateFromGLTF(this.context, {
            // at the given URL
            resourceUrl: `${this.baseUrl}/altspace-cube.glb`,
            // and spawn box colliders around the meshes.
            colliderType: 'box',
            // Also apply the following generic actor properties.
            actor: {
                name: 'Altspace Cube',
                // Parent the glTF model to the text actor.
                transform: {
                    local: {
                        position: { x: 0, y: -1, z: 0 },
                        scale: this.buttonScale
                    }
                }
            }
        });

        const buttonPromiseNext = Actor.CreateFromGLTF(this.context, {
            // at the given URL
            resourceUrl: `${this.baseUrl}/altspace-cube.glb`,
            // and spawn box colliders around the meshes.
            colliderType: 'box',
            // Also apply the following generic actor properties.
            actor: {
                name: 'Altspace Cube',
                // Parent the glTF model to the text actor.
                transform: {
                    local: {
                        position: { x: 0.2, y: -1, z: 0 },
                        scale: this.buttonScale
                    }
                }
            }
        });

        const buttonPromiseLast = Actor.CreateFromGLTF(this.context, {
            // at the given URL
            resourceUrl: `${this.baseUrl}/altspace-cube.glb`,
            // and spawn box colliders around the meshes.
            colliderType: 'box',
            // Also apply the following generic actor properties.
            actor: {
                name: 'Altspace Cube',
                // Parent the glTF model to the text actor.
                transform: {
                    local: {
                        position: { x: -0.2, y: -1, z: 0 },
                        scale: this.buttonScale
                    }
                }
            }
        });

        // Grab that early reference.
        this.cubePlay = buttonPromisePlay.value;
        this.cubeNext = buttonPromiseNext.value;
        this.cubeLast = buttonPromiseLast.value;

        const buttons: Actor[] = [this.cubePlay, this.cubeNext, this.cubeLast];

        for ( let i = 0; i < buttons.length; i++) {
           buttons[i].createAnimation(
                'ButtonPress', {
                    keyframes: this.generatePressKeyFrames( 1.0, buttons[i] ),
                    events: []
                }
            );
        }

        const buttonBehaviorPlay = this.cubePlay.setBehavior(ButtonBehavior);
        const buttonBehaviorNext = this.cubeNext.setBehavior(ButtonBehavior);
        const buttonBehaviorLast = this.cubeLast.setBehavior(ButtonBehavior);

        const buttonLogic: ButtonBehavior[] = [ buttonBehaviorPlay, buttonBehaviorNext, buttonBehaviorLast];

        for ( let i = 0; i < buttonLogic.length; i++) {
            buttonLogic[i].onHover('enter', () => {
                buttons[i].animateTo(
                    { transform: {
                        local: {
                            scale: { x: 0.11, y: 0.11, z: 0.11 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
                    // LEARN: Need to ask if I can do expresions inside a property like scale.
            });

            buttonLogic[i].onHover('exit', () => {
                buttons[i].animateTo(
                    { transform: { local: { scale: this.buttonScale } } }, 0.3, AnimationEaseCurves.EaseOutSine);
            });
        }

        // Get reference for our track array
        this.tracks = this.createTracksArray();
        let firstPlay = true;

        // When clicked, push back.
        buttonBehaviorPlay.onClick('pressed', () => {
            this.cubePlay.enableAnimation('ButtonPress');

            if (this.buttonPlayState === false && firstPlay ) {
                // trackSoundInstance.value.resume();
                this.playTrack( this.tracks[this.trackIndex]);
                this.buttonPlayState = true;
                firstPlay = false;
            } else if ( this.buttonPlayState === false ) {
                this.trackSoundInstance.value.resume();
                this.buttonPlayState = true;
            } else if ( this.buttonPlayState === true ) {
                this.trackSoundInstance.value.pause();
                this.buttonPlayState = false;
            }
            // console.log("tried to play sound 2");

        });

        buttonBehaviorNext.onClick('pressed', () => {
            this.cubeNext.enableAnimation('ButtonPress');
            this.trackIndex++;
            if (this.trackIndex >= this.tracks.length ) {
                this.trackIndex = 0; // restart index
            }
            console.log(this.trackIndex);

            this.trackSoundInstance.value.stop();
            this.playTrack( this.tracks[this.trackIndex]);
        });

        buttonBehaviorLast.onClick('pressed', () => {
            this.cubeLast.enableAnimation('ButtonPress');
            this.trackIndex--;
            if ( this.trackIndex < 0 ) {
                this.trackIndex = (this.tracks.length - 1);
            }
            console.log(this.trackIndex);

            this.trackSoundInstance.value.stop();
            this.playTrack( this.tracks[this.trackIndex]);
        });

    }

    private playTrack( currenTrack: ForwardPromise<Sound>) {
        if (this.songDurationTracker != null ) {
            this.songDurationTracker = null;
        }

        if ( this.trackSoundInstance != null ) {
            this.trackSoundInstance.value.stop();
            this.trackSoundInstance = null;
        }

        this.trackSoundInstance = this.cubePlay.startSound(currenTrack.value.id,
            {volume: 1, looping: true, doppler: 0, spread: 0.7, }, 0.0 );

        this.songDurationTracker = this.monitorPlayingTrack( this.tracks[this.trackIndex], this.tracks );
    }

    private async monitorPlayingTrack( track: ForwardPromise<Sound>, trackList: Array<ForwardPromise<Sound>> ) {
        const trackDuration = track.value.duration;
        console.log(trackDuration);
        await delay( trackDuration * 1000 );
        console.log("completed timer");

        // song completed iterate to next one
        this.trackIndex++;

        // Make sure autoplay restarts list
        if (this.trackIndex >= this.tracks.length ) {
            this.trackIndex = 0; // restart index
        }

        this.playTrack( trackList[this.trackIndex]);
    }

    private createTracksArray() {
        // create audio
        const trackAssetPromise0 = this.context.assetManager.createSound(
            'Track1',
            { uri: `${this.baseUrl}/Dundun.ogg` }
        );

        const trackAssetPromise1 = this.context.assetManager.createSound(
            'Track2',
            { uri: `${this.baseUrl}/46-12-05 Cypress Canyon.ogg` }
        );

        const trackAssetPromise2 = this.context.assetManager.createSound(
            'Track3',
            { uri: `${this.baseUrl}/48-08-09 Fourble.ogg` }
        );

        const trackAssetPromise3 = this.context.assetManager.createSound(
            'Track4',
            { uri: `${this.baseUrl}/500317_Escape_Three_Skeleton_Key.ogg` }
        );

        const tracklist: Array<ForwardPromise<Sound>> = [ trackAssetPromise0,
            trackAssetPromise1, trackAssetPromise2, trackAssetPromise3 ];

        console.log("tracklist size" + tracklist.length);
        return(tracklist);
    }

    private generatePressKeyFrames(duration: number, button: Actor): AnimationKeyframe[] {
        const buttonPos =  button.transform.local.position as Vector3Like;
        return [{
            time: 0 * duration,
            value: { transform: { local: { position: buttonPos } } }
        }, {
            time: 0.3 * duration,
            value: { transform: { local: { position: { ...buttonPos, z: buttonPos.z + 0.15 } } } }
        }, {
            time: 0.5 * duration,
            value: { transform: { local: { position: buttonPos } } }
        }];
    }

}
