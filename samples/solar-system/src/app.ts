/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRESDK from '@microsoft/mixed-reality-extension-sdk';

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
export default class SolarSystem {
    private celestialBodies: CelestialBodySet = {};
    private animationsRunning = false;

    constructor(private context: MRESDK.Context, private baseUrl: string) {
        this.context.onUserJoined(user => this.userJoined(user));
        this.context.onUserLeft(user => this.userLeft(user));
        this.context.onStarted(() => this.started());
        this.context.onStopped(() => this.stopped());
    }

    private started = () => {
        console.log(`session started ${this.context.sessionId}`);

        this.createSolarSystem();

        const sunEntity = this.celestialBodies.sol;
        if (sunEntity && sunEntity.model) {
            const sun = sunEntity.model;
            const sunPrimitives = sun.findChildrenByName('Primitive', true);

            sunPrimitives.forEach((prim) => {
                // Add a collider so that the behavior system will work properly on Unity host apps.
                const center = { x: 0, y: 0, z: 0 } as MRESDK.Vector3Like;
                const radius = 3;
                prim.setCollider('sphere', false, center, radius);

                const buttonBehavior = prim.setBehavior(MRESDK.ButtonBehavior);

                buttonBehavior.onClick(_ => {
                    if (this.animationsRunning) {
                        this.pauseAnimations();
                        this.animationsRunning = false;
                    } else {
                        this.resumeAnimations();
                        this.animationsRunning = true;
                    }
                });

                buttonBehavior.onHover('enter', () => {
                    console.log(`Hover entered on ${sunEntity.model.name}.`);
                });

                buttonBehavior.onHover('exit', () => {
                    console.log(`Hover exited on ${sunEntity.model.name}.`);
                });
            });
        }

        this.resumeAnimations();
        this.animationsRunning = true;
    }

    private stopped() {
        console.log(`session stopped ${this.context.sessionId}`);
    }

    private userJoined(user: MRESDK.User) {
        console.log(`user-joined: ${user.name}, ${user.id}`);
    }

    private userLeft(user: MRESDK.User) {
        console.log(`user-left: ${user.name}`);
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
        console.log(`Loading ${bodyName}`);

        const facts = database[bodyName];

        const distanceMultiplier = Math.pow(facts.distance, 1 / 3);
        const scaleMultiplier = Math.pow(facts.diameter, 1 / 3) / 25;

        const positionValue = { x: distanceMultiplier, y: 0, z: 0 };
        const scaleValue = { x: scaleMultiplier / 2, y: scaleMultiplier / 2, z: scaleMultiplier / 2 };
        const obliquityValue = MRESDK.Quaternion.RotationAxis(
            MRESDK.Vector3.Forward(), facts.obliquity * MRESDK.DegreesToRadians);
        const inclinationValue = MRESDK.Quaternion.RotationAxis(
            MRESDK.Vector3.Forward(), facts.inclination * MRESDK.DegreesToRadians);

        // Object layout for celestial body is:
        //  inclination                 -- orbital plane. centered on sol and tilted
        //      position                -- position of center of celestial body (orbits sol)
        //          label               -- centered above position. location of label.
        //          obliquity0          -- centered on position. hidden node to account
        //                                 for the fact that obliquity is a world-relative axis
        //              obliquity1      -- centered on position. tilt of obliquity axis
        //                  model       -- centered on position. the celestial body (rotates)
        try {
            const inclination = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-inclination`,
                    transform: {
                        app: { rotation: inclinationValue }
                    }
                }
            });
            const position = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-position`,
                    parentId: inclination.value.id,
                    transform: {
                        local: { position: positionValue }
                    }
                }
            });
            const label = MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    name: `${bodyName}-label`,
                    parentId: position.value.id,
                    transform: {
                        local: { position: { y: 0.1 + Math.pow(scaleMultiplier, 1 / 2.5) } }
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
                        local: { rotation: obliquityValue }
                    }
                }
            });
            const model = MRESDK.Actor.CreateFromGLTF(this.context, {
                resourceUrl: `${this.baseUrl}/assets/${bodyName}.gltf`,
                colliderType: 'sphere',
                actor: {
                    name: `${bodyName}-body`,
                    parentId: obliquity1.value.id,
                    transform: {
                        local: { scale: scaleValue }
                    }
                }

            });

            label.value.enableText({
                contents: bodyName,
                height: 0.5,
                pixelsPerLine: 50,
                color: MRESDK.Color3.Yellow(),
                anchor: MRESDK.TextAnchorLocation.TopCenter,
                justify: MRESDK.TextJustify.Center,
            });

            setTimeout(() => {
                label.value.text.color = MRESDK.Color3.White();
            }, 5000);

            this.celestialBodies[bodyName] = {
                inclination: inclination.value,
                position: position.value,
                obliquity0: obliquity0.value,
                obliquity1: obliquity1.value,
                model: model.value
            } as CelestialBody;

            this.createAnimations(bodyName);
        } catch (e) {
            console.log("createBody failed", bodyName, e);
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
            const keyframes: MRESDK.AnimationKeyframe[] = [];
            const angleStep = 360 / this.axialKeyframeCount;
            const initial = celestialBody.model.transform.local.rotation.clone();
            let value: Partial<MRESDK.ActorLike>;

            for (let i = 0; i < this.axialKeyframeCount; ++i) {
                const rotDelta = MRESDK.Quaternion.RotationAxis(
                    MRESDK.Vector3.Up(), (-angleStep * i * spin) * MRESDK.DegreesToRadians);
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
                    wrapMode: MRESDK.AnimationWrapMode.Loop
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
            const keyframes: MRESDK.AnimationKeyframe[] = [];
            const initial = celestialBody.position.transform.local.position.clone();
            let value: Partial<MRESDK.ActorLike>;

            for (let i = 0; i < this.orbitalKeyframeCount; ++i) {
                const rotDelta = MRESDK.Quaternion.RotationAxis(
                    MRESDK.Vector3.Up(), (-angleStep * i) * MRESDK.DegreesToRadians);
                const position = initial.rotateByQuaternionToRef(rotDelta, new MRESDK.Vector3());
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
                    wrapMode: MRESDK.AnimationWrapMode.Loop
                });
        }
    }
}
