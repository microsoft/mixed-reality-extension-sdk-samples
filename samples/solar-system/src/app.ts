/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRESDK from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';

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
    inclination: MRESDK.Actor;
    position: MRESDK.Actor;
    obliquity0: MRESDK.Actor;
    obliquity1: MRESDK.Actor;
    model: MRESDK.Actor;
}

interface CelestialBodySet {
    [key: string]: CelestialBody;
}

// Data source: https://nssdc.gsfc.nasa.gov/planetary/dataheet/
// (some settings modified for scale and dramatic effect)
// tslint:disable-next-line:no-var-requires
const database: Database = require('../public/database.json');

/**
 * Solar System Application
 */
class SolarSystem {
    private celestialBodies: CelestialBodySet = {};
    private animationsRunning = false;
    private server: MRESDK.WebHost;
    private context: MRESDK.Context;
    private logger: MRESDK.Logger;

    constructor() {
        this.server = new MRESDK.WebHost({
            baseDir: resolvePath(__dirname, '../public'),
            baseUrl: 'http://localhost:3901/',
            logger: this.logger = new MRESDK.ConsoleLogger(),
            port: 3901
        });
        // this.logger.disable('success', 'debug');

        this.server.adapter.onConnection((context) => {
            this.context = context;
            this.context.onUserJoined(user => this.userJoined(user));
            this.context.onUserLeft(user => this.userLeft(user));
            this.context.onStarted(() => this.started());
            this.context.onStopped(() => this.stopped());
        });
    }

    private started = async () => {
        this.logger.log('info', `session started ${this.context.sessionId}`);

        await this.createSolarSystem();

        const sunEntity = this.celestialBodies.sol;
        if (sunEntity && sunEntity.model) {
            const sun = sunEntity.model;
            const sunPrimitives = sun.findChildrenByName('Primitive', true);

            sunPrimitives.forEach((prim) => {
                const buttonBehavior = prim.setBehavior(MRESDK.ButtonBehavior);

                buttonBehavior.onClick('pressed', (userId: string) => {
                    if (this.animationsRunning) {
                        this.pauseAnimations();
                        this.animationsRunning = false;
                    } else {
                        this.resumeAnimations();
                        this.animationsRunning = true;
                    }
                });

                buttonBehavior.onHover('enter', (userId: string) => {
                    this.context.logger.log('debug', `Hover entered on ${sunEntity.model.name}.`);
                });

                buttonBehavior.onHover('exit', (userId: string) => {
                    this.context.logger.log('debug', `Hover exited on ${sunEntity.model.name}.`);
                });
            });
        }

        this.resumeAnimations();
        this.animationsRunning = true;
    }

    private stopped() {
        this.logger.log('info', `session stopped ${this.context.sessionId}`);
    }

    private userJoined(user: MRESDK.User) {
        this.logger.log('debug', `user-joined: ${user.name}, ${user.id}`);
    }

    private userLeft(user: MRESDK.User) {
        this.logger.log('debug', `user-left: ${user.name}`);
    }

    private createSolarSystem(): Promise<any> {
        const promises = [];
        const keys = Object.keys(database);
        for (const bodyName of keys) {
            promises.push(this.createBody(bodyName));
        }
        return Promise.all(promises);
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

    private createBody(bodyName: string): Promise<any> {
        this.logger.log('debug', `Loading ${bodyName}`);

        const facts = database[bodyName];

        const distanceMultiplier = Math.pow(facts.distance, 1 / 3);
        const scaleMultiplier = Math.pow(facts.diameter, 1 / 3) / 25;

        const positionValue = { x: distanceMultiplier, y: 0, z: 0 };
        const scaleValue = { x: scaleMultiplier, y: scaleMultiplier, z: scaleMultiplier };
        const obliquityValue = MRESDK.Quaternion.RotationAxis(
            MRESDK.Vector3.Forward(), facts.obliquity * MRESDK.DegreesToRadians
        ).toJSON();
        const inclinationValue = MRESDK.Quaternion.RotationAxis(
            MRESDK.Vector3.Forward(), facts.inclination * MRESDK.DegreesToRadians
        ).toJSON();

        // Object layout for celestial body is:
        //  inclination                 -- orbital plane. centered on sol and tilted
        //      position                -- position of center of celestial body (orbits sol)
        //          obliquity0          -- centered on position. hidden node to account
        //                                 for the fact that obliquity is a world-relative axis
        //              obliquity1      -- centered on position. tilt of obliquity axis
        //                  model       -- centered on position. the celestial body (rotates)
        try {
            const inclination = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-inclination`,
                    transform: {
                        rotation: inclinationValue
                    }
                }
            });
            const position = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-position`,
                    parentId: inclination.value.id,
                    transform: {
                        position: positionValue
                    }
                }
            });
            const obliquity0 = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-obliquity0`,
                    parentId: position.value.id
                }
            });
            const obliquity1 = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-obliquity1`,
                    parentId: obliquity0.value.id,
                    transform: {
                        rotation: obliquityValue
                    }
                }
            });
            const model = MRESDK.Actor.CreateFromGLTF(this.context, {
                resourceUrl: `${this.server.baseUrl}/assets/${bodyName}.gltf`,
                colliderType: 'sphere',
                actor: {
                    name: `${bodyName}-body`,
                    parentId: obliquity1.value.id,
                    transform: {
                        scale: scaleValue
                    }
                }
            });

            position.value.enableText({
                contents: bodyName,
                height: 0.5,
                pixelsPerLine: 50,
                color: MRESDK.Color3.Yellow()
            });

            setTimeout(() => {
                position.value.text.color = MRESDK.Color3.White();
            }, 5000);

            this.celestialBodies[bodyName] = {
                inclination: inclination.value,
                position: position.value,
                obliquity0: obliquity0.value,
                obliquity1: obliquity1.value,
                model: model.value
            } as CelestialBody;

            return Promise.all([
                inclination,
                position,
                obliquity0,
                obliquity1,
                model,
                this.createAnimations(bodyName)
            ]);
        } catch (e) {
            this.logger.log('error', "createBody failed", bodyName, e);
        }
    }

    private createAnimations(bodyName: string): Promise<any> {
        const promises: Array<Promise<any>> = [];
        promises.push(this.createAxialAnimation(bodyName));
        promises.push(this.createOrbitalAnimation(bodyName));
        return Promise.all(promises);
    }

    public readonly timeFactor = 40;
    public readonly axialKeyframeCount = 90;
    public readonly orbitalKeyframeCount = 90;

    private createAxialAnimation(bodyName: string): Promise<any> {
        const facts = database[bodyName];
        const celestialBody = this.celestialBodies[bodyName];

        if (facts.day > 0) {
            const spin = facts.retrograde ? -1 : 1;
            // days = seconds (not in agreement with orbital animation)
            const axisTimeInSeconds = facts.day / this.timeFactor;
            const timeStep = axisTimeInSeconds / this.axialKeyframeCount;
            const keyframes: MRESDK.AnimationKeyframe[] = [];
            const angleStep = 360 / this.axialKeyframeCount;
            const initial = celestialBody.model.transform.rotation.clone();
            let value: Partial<MRESDK.ActorLike>;

            for (let i = 0; i < this.axialKeyframeCount; ++i) {
                const rotDelta = MRESDK.Quaternion.RotationAxis(
                    MRESDK.Vector3.Up(), (-angleStep * i * spin) * MRESDK.DegreesToRadians);
                const rotation = initial.multiply(rotDelta).toJSON();
                value = {
                    transform: {
                        rotation
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
                    rotation: celestialBody.model.transform.rotation.toJSON()
                }
            };
            keyframes.push({
                time: axisTimeInSeconds,
                value,
            });

            // Create the animation on the actor
            return celestialBody.model.createAnimation({
                animationName: `${bodyName}:axial`,
                keyframes,
                events: [],
                wrapMode: MRESDK.AnimationWrapMode.Loop
            });
        }
    }

    private createOrbitalAnimation(bodyName: string): Promise<any> {
        const facts = database[bodyName];
        const celestialBody = this.celestialBodies[bodyName];

        if (facts.year > 0) {
            // years = seconds (not in agreement with axial animation)
            const orbitTimeInSeconds = facts.year / this.timeFactor;
            const timeStep = orbitTimeInSeconds / this.orbitalKeyframeCount;
            const angleStep = 360 / this.orbitalKeyframeCount;
            const keyframes: MRESDK.AnimationKeyframe[] = [];
            const initial = celestialBody.position.transform.position.clone();
            let value: Partial<MRESDK.ActorLike>;

            for (let i = 0; i < this.orbitalKeyframeCount; ++i) {
                const rotDelta = MRESDK.Quaternion.RotationAxis(
                    MRESDK.Vector3.Up(), (-angleStep * i) * MRESDK.DegreesToRadians);
                const position = initial.rotateByQuaternionToRef(rotDelta, new MRESDK.Vector3()).toJSON();
                value = {
                    transform: {
                        position
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
                    position: celestialBody.position.transform.position.toJSON()
                }
            };
            keyframes.push({
                time: orbitTimeInSeconds,
                value,
            });

            // Create the animation on the actor
            return celestialBody.position.createAnimation({
                animationName: `${bodyName}:orbital`,
                keyframes,
                events: [],
                wrapMode: MRESDK.AnimationWrapMode.Loop
            });
        }
    }
}

// Boot up the app
export default new SolarSystem();
