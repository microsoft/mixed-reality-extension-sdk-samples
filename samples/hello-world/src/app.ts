/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	Actor,
	AnimationEaseCurves,
	AnimationKeyframe,
	AnimationWrapMode,
	AssetContainer,
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
	private cube: Actor = null;

	constructor(private context: Context, private baseUrl: string) {
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {
		// Create a new actor with no mesh, but some text.
		this.text = Actor.Create(this.context, {
			actor: {
				name: 'Text',
				transform: {
					app: { position: { x: 0, y: 0.5, z: 0 } }
				},
				text: {
					contents: "Hello World!",
					anchor: TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.3
				}
			}
		});

		// Here we create an animation on our text actor. Animations have three mandatory arguments:
		// a name, an array of keyframes, and an array of events.
		this.text.createAnimation(
			// The name is a unique identifier for this animation. We'll pass it to "startAnimation" later.
			"Spin", {
				// Keyframes define the timeline for the animation: where the actor should be, and when.
				// We're calling the generateSpinKeyframes function to produce a simple 20-second revolution.
				keyframes: this.generateSpinKeyframes(20, Vector3.Up()),
				// Events are points of interest during the animation. The animating actor will emit a given
				// named event at the given timestamp with a given string value as an argument.
				events: [],

				// Optionally, we also repeat the animation infinitely. PingPong alternately runs the animation
				// foward then backward.
				wrapMode: AnimationWrapMode.PingPong
			});

		// Load a glTF model
		this.cube = Actor.CreateFromGltf(new AssetContainer(this.context), {
			// at the given URL
			uri: `${this.baseUrl}/altspace-cube.glb`,
			// and spawn box colliders around the meshes.
			colliderType: 'box',
			// Also apply the following generic actor properties.
			actor: {
				name: 'Altspace Cube',
				// Parent the glTF model to the text actor.
				parentId: this.text.id,
				transform: {
					local: {
						position: { x: 0, y: -1, z: 0 },
						scale: { x: 0.4, y: 0.4, z: 0.4 }
					}
				}
			}
		});

		// Create some animations on the cube.
		this.cube.createAnimation(
			'DoAFlip', {
				keyframes: this.generateSpinKeyframes(1.0, Vector3.Right()),
				events: []
			});

		// Now that the text and its animation are all being set up, we can start playing
		// the animation.
		this.text.enableAnimation('Spin');

		// Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
		// Button behaviors have two pairs of events: hover start/stop, and click start/stop.
		const buttonBehavior = this.cube.setBehavior(ButtonBehavior);

		// Trigger the grow/shrink animations on hover.
		buttonBehavior.onHover('enter', () => {
			this.cube.animateTo(
				{ transform: { local: { scale: { x: 0.5, y: 0.5, z: 0.5 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
		});
		buttonBehavior.onHover('exit', () => {
			this.cube.animateTo(
				{ transform: { local: { scale: { x: 0.4, y: 0.4, z: 0.4 } } } }, 0.3, AnimationEaseCurves.EaseOutSine);
		});

		// When clicked, do a 360 sideways.
		buttonBehavior.onClick(_ => {
			this.cube.enableAnimation('DoAFlip');
		});
	}

	/**
	 * Generate keyframe data for a simple spin animation.
	 * @param duration The length of time in seconds it takes to complete a full revolution.
	 * @param axis The axis of rotation in local space.
	 */
	private generateSpinKeyframes(duration: number, axis: Vector3): AnimationKeyframe[] {
		return [{
			time: 0 * duration,
			value: { transform: { local: { rotation: Quaternion.RotationAxis(axis, 0) } } }
		}, {
			time: 0.25 * duration,
			value: { transform: { local: { rotation: Quaternion.RotationAxis(axis, Math.PI / 2) } } }
		}, {
			time: 0.5 * duration,
			value: { transform: { local: { rotation: Quaternion.RotationAxis(axis, Math.PI) } } }
		}, {
			time: 0.75 * duration,
			value: { transform: { local: { rotation: Quaternion.RotationAxis(axis, 3 * Math.PI / 2) } } }
		}, {
			time: 1 * duration,
			value: { transform: { local: { rotation: Quaternion.RotationAxis(axis, 2 * Math.PI) } } }
		}];
	}
}
