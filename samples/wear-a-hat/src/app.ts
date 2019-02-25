/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRESDK from '@microsoft/mixed-reality-extension-sdk';

/**
 * The structure of a hat entry in the hat database.
 */
type HatDescriptor = {
    displayName: string;
    resourceName: string;
    scale: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    position: {
        x: number;
        y: number;
        z: number;
    };
};

/**
 * The structure of the hat database.
 */
type HatDatabase = {
    [key: string]: HatDescriptor;
};

// Load the database of hats.
// tslint:disable-next-line:no-var-requires variable-name
const HatDatabase: HatDatabase = require('../public/hats.json');

/**
 * WearAHat Application - Showcasing avatar attachments.
 */
export default class WearAHat {
    // Container for preloaded hat prefabs.
    private prefabs: { [key: string]: MRESDK.AssetGroup } = {};
    // Container for instantiated hats.
    private attachedHats: { [key: string]: MRESDK.Actor } = {};

    /**
     * Constructs a new instance of this class.
     * @param context The MRE SDK context.
     * @param baseUrl The baseUrl to this project's `./public` folder.
     */
    constructor(private context: MRESDK.Context, private baseUrl: string) {
        // Hook the context events we're interested in.
        this.context.onStarted(() => this.started());
        this.context.onUserLeft(user => this.userLeft(user));
    }

    /**
     * Called when a Hats application session starts up.
     */
    private async started() {
        // Preload all the hat models.
        await this.preloadHats();
        // Show the hat menu.
        this.showHatMenu();
    }

    /**
     * Called when a user leaves the application (probably left the Altspace world where this app is running).
     * @param user The user that left the building.
     */
    private userLeft(user: MRESDK.User) {
        // If the user was wearing a hat, destroy it. Otherwise it would be
        // orphaned in the world.
        if (this.attachedHats[user.id]) this.attachedHats[user.id].destroy();
        delete this.attachedHats[user.id];
    }

    /**
     * Show a menu of hat selections.
     */
    private showHatMenu() {
        // Create a parent object for all the menu items.
        const menu = MRESDK.Actor.CreateEmpty(this.context).value;
        let y = 0.3;

        // Loop over the hat database, creating a menu item for each entry.
        for (const hatId of Object.keys(HatDatabase)) {
            // Create a clickable button.
            const button = MRESDK.Actor.CreatePrimitive(this.context, {
                definition: {
                    shape: MRESDK.PrimitiveShape.Box,
                    dimensions: { x: 0.3, y: 0.3, z: 0.01 }
                },
                addCollider: true,
                actor: {
                    parentId: menu.id,
                    name: hatId,
                    transform: {
                        position: { x: 0, y, z: 0 }
                    }
                }
            });

            // Set a click handler on the button.
            button.value.setBehavior(MRESDK.ButtonBehavior)
                .onClick('released', (userId: string) => this.wearHat(hatId, userId));

            // Create a label for the menu entry.
            MRESDK.Actor.CreateEmpty(this.context, {
                actor: {
                    parentId: menu.id,
                    name: 'label',
                    text: {
                        contents: HatDatabase[hatId].displayName,
                        height: 0.5,
                        anchor: MRESDK.TextAnchorLocation.MiddleLeft
                    },
                    transform: {
                        position: { x: 0.5, y, z: 0 }
                    }
                }
            });
            y = y + 0.5;
        }

        // Create a label for the menu title.
        MRESDK.Actor.CreateEmpty(this.context, {
            actor: {
                parentId: menu.id,
                name: 'label',
                text: {
                    contents: ''.padStart(8, ' ') + "Wear a Hat",
                    height: 0.8,
                    anchor: MRESDK.TextAnchorLocation.MiddleCenter,
                    color: MRESDK.Color3.Yellow()
                },
                transform: {
                    position: { x: 0.5, y: y + 0.25, z: 0 }
                }
            }
        });
    }

    /**
     * Preload all hat resources. This makes instantiating them faster and more efficient.
     */
    private preloadHats() {
        // Loop over the hat database, preloading each hat resource.
        // Return a promise of all the in-progress load promises. This
        // allows the caller to wait until all hats are done preloading
        // before continuing.
        return Promise.all(
            Object.keys(HatDatabase).map(hatId => {
                const hatRecord = HatDatabase[hatId];
                if (hatRecord.resourceName) {
                    return this.context.assetManager.loadGltf(
                        hatId, `${this.baseUrl}/${hatRecord.resourceName}`)
                        .then(assetGroup => this.prefabs[hatId] = assetGroup)
                        .catch(e => console.error(e));
                } else {
                    return Promise.resolve();
                }
            }));
    }

    /**
     * Instantiate a hat and attach it to the avatar's head.
     * @param hatId The id of the hat in the hat database.
     * @param userId The id of the user we will attach the hat to.
     */
    private wearHat(hatId: string, userId: string) {
        // If the user is wearing a hat, destroy it.
        if (this.attachedHats[userId]) this.attachedHats[userId].destroy();
        delete this.attachedHats[userId];

        const hatRecord = HatDatabase[hatId];

        // If the user selected 'none', then early out.
        if (!hatRecord.resourceName) {
            return;
        }

        // Create the hat model and attach it to the avatar's head.
        this.attachedHats[userId] = MRESDK.Actor.CreateFromPrefab(this.context, {
            prefabId: this.prefabs[hatId].prefabs.byIndex(0).id,
            actor: {
                transform: {
                    position: hatRecord.position,
                    rotation: MRESDK.Quaternion.FromEulerAngles(
                        hatRecord.rotation.x * MRESDK.DegreesToRadians,
                        hatRecord.rotation.y * MRESDK.DegreesToRadians,
                        hatRecord.rotation.z * MRESDK.DegreesToRadians),
                    scale: hatRecord.scale,
                },
                attachment: {
                    attachPoint: 'head',
                    userId
                }
            }
        }).value;
    }
}
