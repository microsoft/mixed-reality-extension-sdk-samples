/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { ButtonMask, GroupMaskManager } from './groupMaskManager';

/**
 * This sample demonstrates how to manage visibility of objects via a group mask.
 */
export default class GroupMaskSample {
	/** A pool of group masks that we can reuse between users. */
	private groupMaskManager: GroupMaskManager;

	/**
	 * Group of cubes that control their appearance through a user mask, only
	 * users that have the base cube highlighted will be able to see these.
	 * This is a server performance advantage over creating a new actor for each user.
	 * Highlight cubes are transparent white cubes that appear over top of
	 * the button a user has highlighted, and should only be visible by
	 * the users with it currently selected.
	 */
	private highlightCubes: MRE.Actor[] = [];

	/*
	 * Altspace logo cubes to appear over top of base cubes to indicate
	 * selection, they should only be visible to users who click the black
	 * cube underneath.
	 */
	private selectionCubes: MRE.Actor[] = [];

	/*
	 * Base black cubes are always visibile to all users. Moving your cursor over
	 * the cube results in a white highlight, clicking results in an altspace branded
	 * cube.
	 */
	private baseCubes: MRE.Actor[] = [];

	/** An asset container to store all our models, materials, and textures. */
	private assets: MRE.AssetContainer;

	/** Text above each button. */
	private texts: MRE.Actor[] = [];

	constructor(public context: MRE.Context) {
		// hook up our MRE callbacks
		this.context.onStarted(() => this.started());
		this.groupMaskManager = new GroupMaskManager(this);
	}

	private async started() {
		// create the materials we'll use to differentiate the button cube states
		this.assets = new MRE.AssetContainer(this.context);
		const whiteMaterial = this.assets.createMaterial("whiteMat", {
			color: { r: 1, g: 1, b: 1, a: .7 },
			alphaMode: MRE.AlphaMode.Blend
		});

		const blackMaterial = this.assets.createMaterial("blackmat", {
			color: MRE.Color3.Black()
		});

		const baseCube = this.assets.createBoxMesh("cube", 0.4, 0.4, 0.4);

		// load our gltf model of the altspace-branded cube
		let altspaceCubePrefab: MRE.Prefab;
		try {
			const altspaceCubeAssets = await this.assets.loadGltf('altspace-cube.glb');
			altspaceCubePrefab = altspaceCubeAssets.find((asset) => { return asset.prefab !== null }).prefab;
		} catch (err) {
			console.log("Failed to load GLB:", err);
		}

		// create an array of buttons
		for (let i = 0; i < 4; ++i) {

			// create the button itself
			const baseButton = MRE.Actor.Create(this.context, {
				actor: {
					transform: { local: { position: { x: -1.5 + i * 2, y: .5, z: 0 }}},
					// it's a black cube
					appearance: {
						meshId: baseCube.id,
						materialId: blackMaterial.id
					},
					// with an auto-sized collider on it
					collider: { geometry: { shape: MRE.ColliderType.Auto }}
				},
			});
			this.baseCubes.push(baseButton);

			// let the user click on these boxes like they're buttons
			const buttonBehavior = baseButton.setBehavior(MRE.ButtonBehavior);

			// when a user clicks a box, add them to that box's clicked group
			buttonBehavior.onClick(user => {
				user.groups.clear();
				user.groups.add(this.groupMaskManager.getButtonMaskTag(ButtonMask.CLICK_A + i));
			});

			// when a user hovers the box, add them to the box's hovered group
			buttonBehavior.onHover('enter', (user) => {
				user.groups.add( this.groupMaskManager.getButtonMaskTag(ButtonMask.HOVER_A + i));
			});
			buttonBehavior.onHover('exit', (user) => {
				user.groups.delete(this.groupMaskManager.getButtonMaskTag(ButtonMask.HOVER_A + i));
			});

			// Create a new actor with no mesh, but some text.
			this.texts.push(MRE.Actor.Create(this.context, {
				actor: {
					parentId: baseCube.id,
					name: 'Text'+i,
					transform: {
						app: { position: { x: -1.5 + 2*i, y: 1, z: 0 }}
					},
					text: {
						contents: "Button #"+(i+1),
						anchor: MRE.TextAnchorLocation.MiddleCenter,
						color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
						height: 0.3
					},
				}
			}));

			// create the button selection highlight
			const highlightedButton = MRE.Actor.Create(this.context, {
				actor: {
					transform: { local: {
						scale: { x: 1.1, y: 1.1, z: 1.1 },
						position: { x: -1.5 + 2 * i, y: .5, z: 0 }}
					},
					appearance: {
						meshId: baseCube.id,
						materialId: whiteMaterial.id
					}
				}
			});
			this.highlightCubes.push(highlightedButton);

			// make the highlight only show up for the users that are currently hovering the button
			highlightedButton.appearance.enabled = this.groupMaskManager.getButtonMask(ButtonMask.HOVER_A + i);

			// only create the branded cubes if we successfully loaded the GLB earlier
			if (!altspaceCubePrefab) { continue; }

			// create the branded cube
			const selectedCube = MRE.Actor.CreateFromPrefab(this.context, {
				// we obtained this prefab from loading the GLB model earlier
				prefabId: altspaceCubePrefab.id,
				actor:{
					name: 'Altspace Cube',
					transform: {
						local: {
							position: { x: -1.5 + 2 * i, y: .5, z: 0 },
							scale: { x: 0.4, y: 0.4, z: 0.4 }
						}
					},
					parentId: baseCube.id
				}
			});
			this.selectionCubes.push(selectedCube);

			// make the branded cube only show up for users that click the button
			selectedCube.appearance.enabled = this.groupMaskManager.getButtonMask(ButtonMask.CLICK_A + i);
		}
	}
}
