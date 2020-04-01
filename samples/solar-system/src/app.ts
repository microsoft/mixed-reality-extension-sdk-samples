/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/**
 * Solar system database
 */
interface Database {
	[key: string]: DatabaseRecord;
}

interface DatabaseRecord {
	name: string;
	parent: string;
	diameter: number;       // km
	distance: number;       // 10^6 km
	day: number;            // hours
	year: number;           // days
	inclination: number;    // degrees
	obliquity: number;      // degrees
	retrograde: boolean;
}

interface CelestialBody {
	inclination: MRE.Actor;
	position: MRE.Actor;
	obliquity0: MRE.Actor;
	obliquity1: MRE.Actor;
	model: MRE.Actor;
}

interface CelestialBodySet {
	[key: string]: CelestialBody;
}

// Data source: https://nssdc.gsfc.nasa.gov/planetary/dataheet/
// (some settings modified for scale and dramatic effect)
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const database: Database = require('../public/database.json');

/**
 * Solar System Application
 */
export default class SolarSystem {
	private celestialBodies: CelestialBodySet = {};
	private animationsRunning = false;
	private assets: MRE.AssetContainer;

	constructor(private context: MRE.Context, private baseUrl: string) {
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted(() => this.started());
	}

	private started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug');

		// version to use with non-async code
		if (isDebug) {
			setTimeout(this.startedImpl, delay);
		} else {
			this.startedImpl();
		}

		// // version to use with async code
		// if (isDebug) {
		// 	await new Promise(resolve => setTimeout(resolve, delay));
		// 	await this.startedImpl();
		// } else {
		// 	await this.startedImpl();
		// }
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl = () => {
		this.createSolarSystem();

		const sunEntity = this.celestialBodies.sol;
		if (sunEntity && sunEntity.model) {
			const sun = sunEntity.model;
			const sunPrimitives = sun.findChildrenByName('Primitive', true);

			sunPrimitives.forEach((prim) => {
				// Add a collider so that the behavior system will work properly on Unity host apps.
				const radius = 3;
				prim.setCollider(MRE.ColliderType.Sphere, false, radius);

				const buttonBehavior = prim.setBehavior(MRE.ButtonBehavior);

				buttonBehavior.onClick(_ => {
					if (this.animationsRunning) {
						this.pauseAnimations();
						this.animationsRunning = false;
					} else {
						this.resumeAnimations();
						this.animationsRunning = true;
					}
				});
			});
		}

		this.resumeAnimations();
		this.animationsRunning = true;
	}

	private createSolarSystem() {
		const keys = Object.keys(database);
		for (const bodyName of keys) {
			this.createBody(bodyName);
		}
	}

	private resumeAnimations() {
		const keys = Object.keys(database);
		for (const bodyName of keys) {
			const celestialBody = this.celestialBodies[bodyName];
			celestialBody.model.resumeAnimation(`${bodyName}:axial`);
			celestialBody.position.resumeAnimation(`${bodyName}:orbital`);
		}
	}

	private pauseAnimations() {
		const keys = Object.keys(database);
		for (const bodyName of keys) {
			const celestialBody = this.celestialBodies[bodyName];
			celestialBody.model.pauseAnimation(`${bodyName}:axial`);
			celestialBody.position.pauseAnimation(`${bodyName}:orbital`);
		}
	}

	private createBody(bodyName: string) {

		const facts = database[bodyName];

		const distanceMultiplier = Math.pow(facts.distance, 1 / 3);
		const scaleMultiplier = Math.pow(facts.diameter, 1 / 3) / 25;

		const positionValue = { x: distanceMultiplier, y: 0, z: 0 };
		const scaleValue = { x: scaleMultiplier / 2, y: scaleMultiplier / 2, z: scaleMultiplier / 2 };
		const obliquityValue = MRE.Quaternion.RotationAxis(
			MRE.Vector3.Forward(), facts.obliquity * MRE.DegreesToRadians);
		const inclinationValue = MRE.Quaternion.RotationAxis(
			MRE.Vector3.Forward(), facts.inclination * MRE.DegreesToRadians);

		// Object layout for celestial body is:
		//  inclination                 -- orbital plane. centered on sol and tilted
		//      position                -- position of center of celestial body (orbits sol)
		//          label               -- centered above position. location of label.
		//          obliquity0          -- centered on position. hidden node to account
		//                                 for the fact that obliquity is a world-relative axis
		//              obliquity1      -- centered on position. tilt of obliquity axis
		//                  model       -- centered on position. the celestial body (rotates)
		try {
			const inclination = MRE.Actor.Create(this.context, {
				actor: {
					name: `${bodyName}-inclination`,
					transform: {
						app: { rotation: inclinationValue }
					}
				}
			});
			const position = MRE.Actor.Create(this.context, {
				actor: {
					name: `${bodyName}-position`,
					parentId: inclination.id,
					transform: {
						local: { position: positionValue }
					}
				}
			});
			const label = MRE.Actor.Create(this.context, {
				actor: {
					name: `${bodyName}-label`,
					parentId: position.id,
					transform: {
						local: { position: { y: 0.1 + Math.pow(scaleMultiplier, 1 / 2.5) } }
					}
				}
			});
			const obliquity0 = MRE.Actor.Create(this.context, {
				actor: {
					name: `${bodyName}-obliquity0`,
					parentId: position.id
				}
			});
			const obliquity1 = MRE.Actor.Create(this.context, {
				actor: {
					name: `${bodyName}-obliquity1`,
					parentId: obliquity0.id,
					transform: {
						local: { rotation: obliquityValue }
					}
				}
			});
			const model = MRE.Actor.CreateFromGltf(this.assets, {
				uri: `${this.baseUrl}/assets/${bodyName}.gltf`,
				actor: {
					name: `${bodyName}-body`,
					parentId: obliquity1.id,
					transform: {
						local: { scale: scaleValue }
					},
					collider: {
						geometry: {
							shape: MRE.ColliderType.Sphere,
							radius: 0.5
						}
					}
				}

			});

			label.enableText({
				contents: bodyName,
				height: 0.5,
				pixelsPerLine: 50,
				color: MRE.Color3.Yellow(),
				anchor: MRE.TextAnchorLocation.TopCenter,
				justify: MRE.TextJustify.Center,
			});

			setTimeout(() => {
				label.text.color = MRE.Color3.White();
			}, 5000);

			this.celestialBodies[bodyName] = {
				inclination,
				position,
				obliquity0,
				obliquity1,
				model
			} as CelestialBody;

			this.createAnimations(bodyName);
		} catch (e) {
			MRE.log.info('app', `createBody failed ${bodyName}, ${e}`);
		}
	}

	private createAnimations(bodyName: string) {
		this.createAxialAnimation(bodyName);
		this.createOrbitalAnimation(bodyName);
	}

	public readonly timeFactor = 40;
	public readonly axialKeyframeCount = 90;
	public readonly orbitalKeyframeCount = 90;

	private createAxialAnimation(bodyName: string) {
		const facts = database[bodyName];
		const celestialBody = this.celestialBodies[bodyName];

		if (facts.day > 0) {
			const spin = facts.retrograde ? -1 : 1;
			// days = seconds (not in agreement with orbital animation)
			const axisTimeInSeconds = facts.day / this.timeFactor;
			const timeStep = axisTimeInSeconds / this.axialKeyframeCount;
			const keyframes: MRE.AnimationKeyframe[] = [];
			const angleStep = 360 / this.axialKeyframeCount;
			const initial = celestialBody.model.transform.local.rotation.clone();
			let value: Partial<MRE.ActorLike>;

			for (let i = 0; i < this.axialKeyframeCount; ++i) {
				const rotDelta = MRE.Quaternion.RotationAxis(
					MRE.Vector3.Up(), (-angleStep * i * spin) * MRE.DegreesToRadians);
				const rotation = initial.multiply(rotDelta);
				value = {
					transform: {
						local: { rotation }
					}
				};
				keyframes.push({
					time: timeStep * i,
					value,
				});
			}

			// Final frame
			value = {
				transform: {
					local: { rotation: celestialBody.model.transform.local.rotation }
				}
			};
			keyframes.push({
				time: axisTimeInSeconds,
				value,
			});

			// Create the animation on the actor
			celestialBody.model.createAnimation(
				`${bodyName}:axial`, {
					keyframes,
					events: [],
					wrapMode: MRE.AnimationWrapMode.Loop
				});
		}
	}

	private createOrbitalAnimation(bodyName: string) {
		const facts = database[bodyName];
		const celestialBody = this.celestialBodies[bodyName];

		if (facts.year > 0) {
			// years = seconds (not in agreement with axial animation)
			const orbitTimeInSeconds = facts.year / this.timeFactor;
			const timeStep = orbitTimeInSeconds / this.orbitalKeyframeCount;
			const angleStep = 360 / this.orbitalKeyframeCount;
			const keyframes: MRE.AnimationKeyframe[] = [];
			const initial = celestialBody.position.transform.local.position.clone();
			let value: Partial<MRE.ActorLike>;

			for (let i = 0; i < this.orbitalKeyframeCount; ++i) {
				const rotDelta = MRE.Quaternion.RotationAxis(
					MRE.Vector3.Up(), (-angleStep * i) * MRE.DegreesToRadians);
				const position = initial.rotateByQuaternionToRef(rotDelta, new MRE.Vector3());
				value = {
					transform: {
						local: { position }
					}
				};
				keyframes.push({
					time: timeStep * i,
					value,
				});
			}

			// Final frame
			value = {
				transform: {
					local: { position: celestialBody.position.transform.local.position }
				}
			};
			keyframes.push({
				time: orbitTimeInSeconds,
				value,
			});

			// Create the animation on the actor
			celestialBody.position.createAnimation(
				`${bodyName}:orbital`, {
					keyframes,
					events: [],
					wrapMode: MRE.AnimationWrapMode.Loop
				});
		}
	}
}
