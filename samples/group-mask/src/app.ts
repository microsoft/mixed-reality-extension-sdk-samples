/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import GroupMaskManager, { ButtonMask } from './groupMaskManager'
export default class GroupMaskSample {

	private groupMaskManager: GroupMaskManager;
	
	//Group of cubes that control their appearance through a user mask, only
	//users that have the base cube highlighted will be able to see these.
	//This is a performance advantage to creating a new actor for each user
	//Highlight cubes are transparent white cubes that appear over top of
	//the button a user has highlighted, and should only be visible by
	//the users with it currently selected 
	private highlightCubes: MRE.Actor[] = [];

	//Altspace logo cubes to appear over top of base cubes to indicate
	//selection, they should only be visible to users who click the black
	//cube underneath
	private selectionCubes: MRE.Actor[] = [];

	//Base black cubes are always visibile to all users. Moving your cursor over
	//the cube results in a white highlight, clicking results in an altspace branded
	//cube
	private baseCubes: MRE.Actor[] = [];
	private assets: MRE.AssetContainer;

	//Text above each button
	private texts: MRE.Actor[] = [];

	constructor(public context: MRE.Context, private baseUrl: string) {
		this.context.onStarted(() => this.started());

		this.groupMaskManager = new GroupMaskManager(this);
	}

	private async started() {
		this.assets = new MRE.AssetContainer(this.context);
		const whiteMaterial = this.assets.createMaterial("whiteMat", {
			color: {r: 1, g: 1, b: 1, a: .7},
			alphaMode: MRE.AlphaMode.Blend
		})

		const blackMaterial = this.assets.createMaterial("blackmat", {
			color: {r: 0, g: 0, b: 0, a: 1},
			alphaMode: MRE.AlphaMode.Opaque
		})

		const baseCube = this.assets.createPrimitiveMesh("cube", {
			shape: MRE.PrimitiveShape.Box,
			dimensions: {x:0.4, y:0.4, z:0.4}
		});

		let altspaceCubeAssets: MRE.Asset[];

		await this.assets.loadGltf(`${this.baseUrl}/altspace-cube.glb`).then((asset)=>{
			altspaceCubeAssets = asset; 
		});

		const altspaceCubePrefab = altspaceCubeAssets.find((asset) => { return asset.prefab !== null })

		for(let i = 0; i < 4; ++i) {

			const baseButton = MRE.Actor.Create(this.context, {
				actor: {
					transform: {local: {position: { x: -1.5 + i*2, y: .5, z: 0 }}},
					appearance: {
						meshId: baseCube.id,
						materialId: blackMaterial.id
					},
					collider: {
						enabled: true,
						geometry: {
							shape: MRE.ColliderType.Box,
							size:{x:.4, y:.4, z:.4}
						},
						layer: MRE.CollisionLayer.Default
					}
				},
			});

			const buttonBehavior = baseButton.setBehavior(MRE.ButtonBehavior);

			buttonBehavior.onClick(user => {
				//Behavior to handle user selections goes here

				//Clear all groups and add user to the selected group
				user.groups.clear();
				user.groups.add(this.groupMaskManager.getButtonMaskTag(ButtonMask.CLICK_A + i));
			});
			buttonBehavior.onHover('enter', (user) => {
				//Add hover group to user 
				user.groups.add( this.groupMaskManager.getButtonMaskTag(ButtonMask.HOVER_A + i));	
			});
			buttonBehavior.onHover('exit', (user) => {
				//Remove hover group from user
				user.groups.delete(this.groupMaskManager.getButtonMaskTag(ButtonMask.HOVER_A + i));
			});

			this.baseCubes.push(baseButton);

			const highlightedButton = MRE.Actor.Create(this.context, {
				actor: {
					transform: {local: {
						scale: {x:1.1, y:1.1, z:1.1},
						position: { x: -1.5 + 2*i, y: .5, z: 0 }}},
					appearance: {
						meshId: baseCube.id,
						materialId: whiteMaterial.id
					},
				},
			});


			highlightedButton.appearance.enabled = this.groupMaskManager.getButtonMask(ButtonMask.HOVER_A + i); 
			this.highlightCubes.push(highlightedButton);

			//Load a glTF model for the selected state
			const selectedCube = MRE.Actor.CreateFromPrefab(this.context,{
				prefabId: altspaceCubePrefab.id,
				actor:{
					name: 'Altspace Cube',
					transform: {
						local: {
							position: { x: -1.5 + 2*i, y: .5, z: 0 },
							scale: { x: 0.4, y: 0.4, z: 0.4 }
						}
					},
					parentId: baseCube.id
				}});

			selectedCube.appearance.enabled = this.groupMaskManager.getButtonMask(ButtonMask.CLICK_A + i);
			this.selectionCubes.push( selectedCube );

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
		}
	}
}
