/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * app.ts - © Microsoft
 */
import {
    Actor,
    AnimationKeyframe,
    AnimationWrapMode,
    ButtonBehavior,
    ColliderType,
    Context,
    Quaternion,
    TextAnchorLocation,
    Vector3,
} from 'mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
    private text: Actor = null;
    private cube: Actor = null;

    /**
     * Called by the server, initializes the whole app.
     * @param context An active MRE context
     * @param baseUrl The URL that the static assets are hosted from
     */
    constructor(private context: Context, private baseUrl: string) {
        // Four events are emitted by contexts: onStarted, onStopped, onUserJoined, and onUserLeft.
        // For this app we only care about the started event so we can set up.
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private started() {

        // Create a new actor with no mesh, but some text. This operation is asynchronous, so
        // it returns a "forward" promise (a special promise, as we'll see later).
        const textPromise = Actor.CreateEmpty(this.context, {
            actor: {
                name: 'Text',
                transform: {
                    position: { x: 0, y: 0.5, z: 0 }
                },
                text: {
                    contents: "Hello World!",
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
        this.text.createAnimation({
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
        });

        // Load a glTF model
        const cubePromise = Actor.CreateFromGLTF(this.context, {
            // at the given URL
            resourceUrl: `${this.baseUrl}/altspace-cube.glb`,
            // and spawn box colliders around the meshes.
            colliderType: 'box',
            // Also apply the following generic actor properties.
            actor: {
                name: 'Altspace Cube',
                // Parent the glTF model to the text actor.
                parentId: this.text.id,
                transform: {
                    position: { x: 0, y: -1, z: 0 },
                    scale: { x: 0.4, y: 0.4, z: 0.4 }
                }
            }
        });

        // Grab that early reference again.
        this.cube = cubePromise.value;

        // Create some animations on the cube.
        this.cube.createAnimation({
            animationName: 'GrowIn',
            keyframes: this.growAnimationData,
            events: []
        });

        this.cube.createAnimation({
            animationName: 'ShrinkOut',
            keyframes: this.shrinkAnimationData,
            events: []
        });

        this.cube.createAnimation({
            animationName: 'DoAFlip',
            keyframes: this.generateSpinKeyframes(0.5, Vector3.Right()),
            events: []
        });

        // Now that the text and its animation are all being set up, we can start playing
        // the animation.
        this.text.startAnimation('Spin');

        // Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
        // Button behaviors have two pairs of events: hover start/stop, and click start/stop.
        const buttonBehavior = this.cube.setBehavior(ButtonBehavior);

        // Trigger the grow/shrink animations on hover.
        buttonBehavior.hover.on('started', () => this.cube.startAnimation('GrowIn'));
        buttonBehavior.hover.on('stopped', () => this.cube.startAnimation('ShrinkOut'));

        // When clicked, do a 360 sideways.
        buttonBehavior.click.on('started', () => this.cube.startAnimation('DoAFlip'));
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
