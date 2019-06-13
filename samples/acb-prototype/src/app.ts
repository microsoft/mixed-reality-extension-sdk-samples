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
    Quaternion,
    TextAnchorLocation,
    Vector3
} from '@microsoft/mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
    private text: Actor = null;
    private cubePlay: Actor = null;
    private cubeNext: Actor = null;
    private buttons: Actor[] = [ this.cubePlay, this.cubeNext ];
    private buttonState = false;
    private trackList: string[] = [ "500317_Escape_Three_Skeleton_Key.ogg", "48-08-09 Fourble.ogg",
     "46-12-05 Cypress Canyon.ogg" ];
    private trackIndex = 0;

    constructor(private context: Context, private baseUrl: string) {
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private started() {

        // Load a glTF model
        const buttonPromise = Actor.CreateFromGLTF(this.context, {
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
                        scale: { x: 0.4, y: 0.4, z: 0.4 }
                    }
                }
            }
        });
/*
        for ( let i = 0; i < this.buttons.length; i++) {
            this.buttons[i] = buttonPromise.value;

            if (i === 1) {
                this.buttons[i] = ActorTransform()
                // transform.local.position({ x: 0, y: -1, z: 0 });
            }
        }
*/
        // Grab that early reference.
        this.cubePlay = buttonPromise.value;

        // Create some animations on the cube.
        this.cubePlay.createAnimation(
            'ButtonPress', {
                keyframes: this.generatePressKeyFrames( 1.0, Vector3.Up() ),
                events: []
            }
        );

        // create audio
        const trackAssetPromise = this.context.assetManager.createSound(
            'group1',
            { uri: `${this.baseUrl}/500317_Escape_Three_Skeleton_Key.ogg` }
        );

        const trackSoundInstance = buttonPromise.value.startSound(trackAssetPromise.value.id,
            {volume: 1, looping: true, doppler: 0, spread: 0.7, }, 0.0 );

        trackSoundInstance.value.pause();

        // Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
        // Button behaviors have two pairs of events: hover start/stop, and click start/stop.
        const buttonBehavior = this.cubePlay.setBehavior(ButtonBehavior);

        // Trigger the grow/shrink animations on hover.
        buttonBehavior.onHover('enter', () => {
            this.cubePlay.animateTo(
                { transform: { local: { scale: { x: 0.5, y: 0.5, z: 0.5 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
        });
        buttonBehavior.onHover('exit', () => {
            this.cubePlay.animateTo(
                { transform: { local: { scale: { x: 0.4, y: 0.4, z: 0.4 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
        });

        // When clicked, push back.
        buttonBehavior.onClick('pressed', () => {
            this.cubePlay.enableAnimation('ButtonPress');
            if (this.buttonState === false ) {
                trackSoundInstance.value.resume();
                this.buttonState = true;
            } else if ( this.buttonState === true ) {
                trackSoundInstance.value.pause();
                this.buttonState = false;
            }
            // console.log("tried to play sound 2");

        });
    }

    /**
     * Generate keyframe data for a simple press animation.
     * @param duration The length of time in seconds it takes to complete a full revolution.
     * @param axis The axis of rotation in local space.
     */
    private generatePressKeyFrames(duration: number, axis: Vector3): AnimationKeyframe[] {
        return [{
            time: 0 * duration,
            value: { transform: { local: {position: {x: 0, y: -1, z: 0} } } }
        }, {
            time: 0.3 * duration,
            value: { transform: { local: {position: {x: 0, y: -1, z: 0.3} } } }
        }, {
            time: 0.5 * duration,
            value: { transform: { local: {position: {x: 0, y: -1, z: 0} } } }
        }];
    }

}
