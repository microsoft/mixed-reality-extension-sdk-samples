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
    Vector3,
    Vector3Like,
    ForwardPromise
} from '@microsoft/mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
    private text: Actor = null;
    private cubePlay: Actor = null;
    private cubeNext: Actor = null;
    private cubeLast: Actor = null;
    private buttonScale = { x: 0.09, y: 0.09, z: 0.09 };
    private buttonState = false;
    private trackIndex = 0;

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

        let buttons: Actor[] = [this.cubePlay, this.cubeNext, this.cubeLast];

        for( let i = 0; i < buttons.length; i++)
        {
           buttons[i].createAnimation(
                'ButtonPress', {
                    keyframes: this.generatePressKeyFrames( 1.0, buttons[i] ),
                    events: []
                }
            )
        };

        const buttonBehaviorPlay = this.cubePlay.setBehavior(ButtonBehavior);
        const buttonBehaviorNext = this.cubeNext.setBehavior(ButtonBehavior);
        const buttonBehaviorLast = this.cubeLast.setBehavior(ButtonBehavior);

        let buttonLogic: ButtonBehavior[] = [ buttonBehaviorPlay, buttonBehaviorNext, buttonBehaviorLast];

        for( let i = 0; i < buttonLogic.length; i++)
        {
            buttonLogic[i].onHover('enter', () => {
                buttons[i].animateTo(
                    { transform: { local: { scale: { x: 0.11, y: 0.11, z: 0.11 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
                    //LEARN: Need to ask if I can do expresions inside a property like scale.
            });
                    
            buttonLogic[i].onHover('exit', () => {
                buttons[i].animateTo(
                    { transform: { local: { scale: this.buttonScale } } }, 0.3, AnimationEaseCurves.EaseOutSine);
            });
        };

        
/*        
        const trackSoundInstance = buttonPromisePlay.value.startSound(trackAssetPromise.value.id,
            {volume: 1, looping: true, doppler: 0, spread: 0.7, }, 0.0 );

        trackSoundInstance.value.pause();
*/
        buttonBehaviorNext.onClick('pressed', () => {
            this.cubeNext.enableAnimation('ButtonPress');
        
        });

        buttonBehaviorLast.onClick('pressed', () => {
            this.cubeLast.enableAnimation('ButtonPress');
        
        });
        
        // When clicked, push back.
        buttonBehaviorPlay.onClick('pressed', () => {
            this.cubePlay.enableAnimation('ButtonPress');
            if (this.buttonState === false ) {
                //trackSoundInstance.value.resume();
                this.buttonState = true;
            } else if ( this.buttonState === true ) {
                //trackSoundInstance.value.pause();
                this.buttonState = false;
            }
            // console.log("tried to play sound 2");

        });
        

    }

    private CreateTracks()
    {
        // create audio
        const trackAssetPromise0 = this.context.assetManager.createSound(
            'Track1',
            { uri: `${this.baseUrl}/500317_Escape_Three_Skeleton_Key.ogg` }
        );

        const trackAssetPromise1 = this.context.assetManager.createSound(
            'Track2',
            { uri: `${this.baseUrl}/46-12-05 Cypress Canyon.ogg` }
        );
        
        const trackAssetPromise2 = this.context.assetManager.createSound(
            'Track3',
            { uri: `${this.baseUrl}/48-08-09 Fourble.ogg` }
        );
        
        let tracklist = [ trackAssetPromise0, trackAssetPromise1, trackAssetPromise2 ];

        return(tracklist);

    }

    private generatePressKeyFrames(duration: number, button: Actor): AnimationKeyframe[] 
    {
        let buttonPos = <Vector3Like>button.transform.local.position;
        return [{
            time: 0 * duration,
            value: { transform: { local: { position: buttonPos } } }
        }, {
            time: 0.3 * duration,
            value: { transform: { local: { position: { ...buttonPos, z: buttonPos.z + 0.3 } } } }
        }, {
            time: 0.5 * duration,
            value: { transform: { local: { position: buttonPos } } }
        }];
    }

}
