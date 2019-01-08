/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Actor,
    AnimationKeyframe,
    AnimationWrapMode,
    ButtonBehavior,
    Context,
    Quaternion,
    TextAnchorLocation,
    Vector3
} from '@microsoft/mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class TicTacToe {
    private text: Actor = null;

    constructor(private context: Context, private baseUrl: string) {
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private async started() {
        // Create a new actor with no mesh, but some text. This operation is asynchronous, so
        // it returns a "forward" promise (a special promise, as we'll see later).
        const textPromise = Actor.CreateEmpty(this.context, {
            actor: {
                name: 'Text',
                transform: {
                    position: { x: 0, y: 1.5, z: 0 }
                },
                text: {
                    contents: "Tic-Tac-Toe!",
                    anchor: TextAnchorLocation.MiddleCenter,
                    color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
                    height: 0.3
                }
            }
        });

        // Even though the actor is not yet created in Altspace (because we didn't wait for the promise),
        // we can still get a reference to it by grabbing the `value` field from the forward promise.
        this.text = textPromise.value;

        // Here we create an animation on our text actor. Animations have three mandatory arguments:
        // a name, an array of keyframes, and an array of events.
        const textAnimationPromise = this.text.createAnimation({
            // The name is a unique identifier for this animation. We'll pass it to "startAnimation" later.
            animationName: "Spin",
            // Keyframes define the timeline for the animation: where the actor should be, and when.
            // We're calling the generateSpinKeyframes function to produce a simple 20-second revolution.
            keyframes: this.generateSpinKeyframes(20, Vector3.Up()),
            // Events are points of interest during the animation. The animating actor will emit a given
            // named event at the given timestamp with a given string value as an argument.
            events: [],

            // Optionally, we also repeat the animation infinitely.
            wrapMode: AnimationWrapMode.Loop
        }).catch(reason => console.log(`Failed to create spin animation: ${reason}`));

        // TODO: This shouldn't be necessary as playanimation should be awaiting the textanimation first.
        await textAnimationPromise;

        for (let tileIndexX = 0; tileIndexX < 3; tileIndexX++) {
            for (let tileIndexZ = 0; tileIndexZ < 3; tileIndexZ++) {
                // Load a glTF model
                const cubePromise = Actor.CreateFromGLTF(this.context, {
                    // at the given URL
                    resourceUrl: `${this.baseUrl}/altspace-cube.glb`,
                    // and spawn box colliders around the meshes.
                    colliderType: 'box',
                    // Also apply the following generic actor properties.
                    actor: {
                        name: 'Altspace Cube',
                        transform: {
                            position: { x: (tileIndexX) - 1.0, y: 0.5, z: (tileIndexZ) - 1.0 },
                            scale: { x: 0.4, y: 0.4, z: 0.4 }
                        }
                    }
                });

                // Grab that early reference again.
                const cube = cubePromise.value;

                // Create some animations on the cube.
                cube.createAnimation({
                    animationName: 'GrowIn',
                    keyframes: this.growAnimationData,
                    events: []
                }).catch(reason => console.log(`Failed to create grow animation: ${reason}`));

                cube.createAnimation({
                    animationName: 'ShrinkOut',
                    keyframes: this.shrinkAnimationData,
                    events: []
                }).catch(reason => console.log(`Failed to create shrink animation: ${reason}`));

                cube.createAnimation({
                    animationName: 'DoAFlip',
                    keyframes: this.generateSpinKeyframes(1.0, Vector3.Right()),
                    events: []
                }).catch(reason => console.log(`Failed to create flip animation: ${reason}`));

                // Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
                // Button behaviors have two pairs of events: hover start/stop, and click start/stop.
                const buttonBehavior = cube.setBehavior(ButtonBehavior);

                // Trigger the grow/shrink animations on hover.
                buttonBehavior.onHover('enter', (userId: string) => {
                    cube.startAnimation('GrowIn');
                });
                buttonBehavior.onHover('exit', (userId: string) => {
                    cube.startAnimation('ShrinkOut');
                });

                // When clicked, do a 360 sideways.
                buttonBehavior.onClick('pressed', (userId: string) => {
                    cube.startAnimation('DoAFlip');
                });
            }
        }
        // Now that the text and its animation are all being set up, we can start playing
        // the animation.
        this.text.startAnimation('Spin');
    }

    /**
     * Generate keyframe data for a simple spin animation.
     * @param duration The length of time in seconds it takes to complete a full revolution.
     * @param axis The axis of rotation in local space.
     */
    private generateSpinKeyframes(duration: number, axis: Vector3): AnimationKeyframe[] {
        return [{
            time: 0 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, 0) } }
        }, {
            time: 0.25 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, Math.PI / 2) } }
        }, {
            time: 0.5 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, Math.PI) } }
        }, {
            time: 0.75 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, 3 * Math.PI / 2) } }
        }, {
            time: 1 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, 2 * Math.PI) } }
        }, {
            time: 2 * duration,
            value: { transform: { rotation: Quaternion.RotationAxis(axis, 2 * Math.PI) } }
        }];
    }

    private growAnimationData: AnimationKeyframe[] = [{
        time: 0,
        value: { transform: { scale: { x: 0.4, y: 0.4, z: 0.4 } } }
    }, {
        time: 0.3,
        value: { transform: { scale: { x: 0.5, y: 0.5, z: 0.5 } } }
    }];

    private shrinkAnimationData: AnimationKeyframe[] = [{
        time: 0,
        value: { transform: { scale: { x: 0.5, y: 0.5, z: 0.5 } } }
    }, {
        time: 0.3,
        value: { transform: { scale: { x: 0.4, y: 0.4, z: 0.4 } } }
    }];
}
