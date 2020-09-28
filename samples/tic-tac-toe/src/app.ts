/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

enum GameState {
	Intro,
	Play,
	Celebration
}

enum GamePiece {
	X,
	O
}

/**
 * The main class of this app. All the logic goes here.
 */
export default class TicTacToe {
	private assets: MRE.AssetContainer;
	private text: MRE.Actor = null;
	private textAnchor: MRE.Actor = null;
	private light: MRE.Actor = null;
	private gameState: GameState;

	private currentPlayerGamePiece: GamePiece;
	private nextPlayerGamePiece: GamePiece;

	private boardState: GamePiece[];

	private gamePieceActors: MRE.Actor[];

	private victoryChecks = [
		[0 * 3 + 0, 0 * 3 + 1, 0 * 3 + 2],
		[1 * 3 + 0, 1 * 3 + 1, 1 * 3 + 2],
		[2 * 3 + 0, 2 * 3 + 1, 2 * 3 + 2],
		[0 * 3 + 0, 1 * 3 + 0, 2 * 3 + 0],
		[0 * 3 + 1, 1 * 3 + 1, 2 * 3 + 1],
		[0 * 3 + 2, 1 * 3 + 2, 2 * 3 + 2],
		[0 * 3 + 0, 1 * 3 + 1, 2 * 3 + 2],
		[2 * 3 + 0, 1 * 3 + 1, 0 * 3 + 2]
	];

	constructor(private context: MRE.Context) {
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug');

		// // version to use with non-async code
		// if (isDebug) {
		// 	setTimeout(this.startedImpl, delay);
		// } else {
		// 	this.startedImpl();
		// }

		// version to use with async code
		if (isDebug) {
			await new Promise(resolve => setTimeout(resolve, delay));
			await this.startedImpl();
		} else {
			await this.startedImpl();
		}
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl = async () => {
		// Create a new actor with no mesh, but some text.
		this.textAnchor = MRE.Actor.Create(this.context, {
			actor: {
				name: 'TextAnchor',
				transform: {
					app: { position: { x: 0, y: 1.2, z: 0 } }
				},
			}
		});

		this.text = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.textAnchor.id,
				name: 'Text',
				transform: {
					local: { position: { x: 0, y: 0.0, z: -1.5 } }
				},
				text: {
					// NOTE: this is NOT the spinning text you see in your world
					// that Tic-Tac-Toe! text is in the beginGameStateIntro() function below
					contents: "Tic-Tac-Toe!",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.3
				},
			}
		});
		this.light = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.text.id,
				name: 'Light',
				transform: {
					local: {
						position: { x: 0, y: 1.0, z: -0.5 },
						rotation: MRE.Quaternion.RotationAxis(MRE.Vector3.Left(), -45.0 * MRE.DegreesToRadians),
					}
				},
				light: {
					color: { r: 1, g: 0.6, b: 0.3 },
					type: 'spot',
					intensity: 20,
					range: 6,
					spotAngle: 45 * MRE.DegreesToRadians
				},

			}
		});

		// Here we create an animation for our text actor. First we create animation data, which can be used on any
		// actor. We'll reference that actor with the placeholder "text".
		const spinAnimData = this.assets.createAnimationData(
			// The name is a unique identifier for this data. You can use it to find the data in the asset container,
			// but it's merely descriptive in this sample.
			"Spin",
			{
				// Animation data is defined by a list of animation "tracks": a particular property you want to change,
				// and the values you want to change it to.
				tracks: [{
					// This animation targets the rotation of an actor named "text"
					target: MRE.ActorPath("text").transform.local.rotation,
					// And the rotation will be set to spin over 20 seconds
					keyframes: this.generateSpinKeyframes(20, MRE.Vector3.Up()),
					// And it will move smoothly from one frame to the next
					easing: MRE.AnimationEaseCurves.Linear
				}]
			});
		// Once the animation data is created, we can create a real animation from it.
		spinAnimData.bind(
			// We assign our text actor to the actor placeholder "text"
			{ text: this.text },
			// And set it to play immediately, and bounce back and forth from start to end
			{ isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });

		const growAnimData = this.assets.createAnimationData("Grow", { tracks: [{
			target: MRE.ActorPath("target").transform.local.scale,
			keyframes: this.GrowKeyframeData
		}]});

		const flipAnimData = this.assets.createAnimationData("DoAFlip", { tracks: [{
			target: MRE.ActorPath("target").transform.local.rotation,
			keyframes: this.generateSpinKeyframes(1.0, MRE.Vector3.Right())
		}]});

		// Load box model from glTF
		const gltf = await this.assets.loadGltf('altspace-cube.glb', 'box');

		// Also load the player choice markers now, for efficiency's sake
		const circle = this.assets.createCylinderMesh('circle', 0.2, 0.4, 'y', 16);
		const square = this.assets.createBoxMesh('square', 0.70, 0.2, 0.70);

		for (let tileIndexX = 0; tileIndexX < 3; tileIndexX++) {
			for (let tileIndexZ = 0; tileIndexZ < 3; tileIndexZ++) {
				// Create a glTF actor
				const cube = MRE.Actor.CreateFromPrefab(this.context, {
					// Use the preloaded glTF for each box
					firstPrefabFrom: gltf,
					// Also apply the following generic actor properties.
					actor: {
						name: 'Altspace Cube',
						transform: {
							app: {
								position: { x: (tileIndexX) - 1.0, y: 0.5, z: (tileIndexZ) - 1.0 },
							},
							local: { scale: { x: 0.4, y: 0.4, z: 0.4 } }
						}
					}
				});

				// Create some animations on the cube.
				growAnimData.bind({ target: cube }, { name: "GrowIn", speed: 1 });
				growAnimData.bind({ target: cube }, { name: "ShrinkOut", speed: -1 });
				flipAnimData.bind({ target: cube });

				// Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
				// Button behaviors have two pairs of events: hover start/stop, and click start/stop.
				const buttonBehavior = cube.setBehavior(MRE.ButtonBehavior);

				// Trigger the grow/shrink animations on hover.
				buttonBehavior.onHover('enter', () => {
					if (this.gameState === GameState.Play &&
						this.boardState[tileIndexX * 3 + tileIndexZ] === undefined) {
						cube.targetingAnimationsByName.get("GrowIn").play();
						cube.targetingAnimationsByName.get("ShrinkOut").stop();
					}
				});
				buttonBehavior.onHover('exit', () => {
					if (this.gameState === GameState.Play &&
						this.boardState[tileIndexX * 3 + tileIndexZ] === undefined) {
						cube.targetingAnimationsByName.get("GrowIn").stop();
						cube.targetingAnimationsByName.get("ShrinkOut").play();
					}
				});

				buttonBehavior.onClick(() => {
					switch (this.gameState) {
						case GameState.Intro:
							this.beginGameStatePlay();
							cube.targetingAnimationsByName.get("GrowIn").play();
							break;
						case GameState.Play:
							// When clicked, put down a tile, and do a victory check
							if (this.boardState[tileIndexX * 3 + tileIndexZ] === undefined) {
								MRE.log.info("app", "Putting an " + GamePiece[this.currentPlayerGamePiece] +
									" on: (" + tileIndexX + "," + tileIndexZ + ")");
								const gamePiecePosition = new MRE.Vector3(
									cube.transform.local.position.x,
									cube.transform.local.position.y + 0.55,
									cube.transform.local.position.z);
								if (this.currentPlayerGamePiece === GamePiece.O) {
									this.gamePieceActors.push(MRE.Actor.Create(this.context, {
										actor: {
											name: 'O',
											appearance: { meshId: circle.id },
											transform: {
												local: { position: gamePiecePosition }
											}
										}
									}));
								} else {
									this.gamePieceActors.push(MRE.Actor.Create(this.context, {
										actor: {
											name: 'X',
											appearance: { meshId: square.id },
											transform: {
												local: { position: gamePiecePosition }
											}
										}
									}));
								}
								this.boardState[tileIndexX * 3 + tileIndexZ] = this.currentPlayerGamePiece;
								cube.targetingAnimationsByName.get("GrowIn").stop();
								cube.targetingAnimationsByName.get("ShrinkOut").play();

								const tempGamePiece = this.currentPlayerGamePiece;
								this.currentPlayerGamePiece = this.nextPlayerGamePiece;
								this.nextPlayerGamePiece = tempGamePiece;

								this.text.text.contents = "Next Piece: " + GamePiece[this.currentPlayerGamePiece];

								for (const victoryCheck of this.victoryChecks) {
									if (this.boardState[victoryCheck[0]] !== undefined &&
										this.boardState[victoryCheck[0]] === this.boardState[victoryCheck[1]] &&
										this.boardState[victoryCheck[0]] === this.boardState[victoryCheck[2]]) {
										this.beginGameStateCelebration(tempGamePiece);
										break;
									}
								}

								let hasEmptySpace = false;
								for (let i = 0; i < 3 * 3; i++) {
									if (this.boardState[i] === undefined) {
										hasEmptySpace = true;
									}
								}
								if (hasEmptySpace === false) {
									this.beginGameStateCelebration(undefined);
								}
							}
							break;
						case GameState.Celebration:
						default:
							this.beginGameStateIntro();
							break;
					}
				});
			}
		}
		// Now that the text and its animation are all being set up, we can start playing
		// the animation.
		this.beginGameStateIntro();
	}

	private beginGameStateCelebration(winner: GamePiece) {
		MRE.log.info("app", "BeginGameState Celebration");
		this.gameState = GameState.Celebration;
		this.light.light.color = { r: 0.3, g: 1.0, b: 0.3 };

		if (winner === undefined) {
			MRE.log.info("app", "Tie");
			this.text.text.contents = "Tie";
		} else {
			MRE.log.info("app", "Winner: " + GamePiece[winner]);
			this.text.text.contents = "Winner: " + GamePiece[winner];
		}
	}

	private beginGameStateIntro() {
		MRE.log.info("app", "BeginGameState Intro");
		this.gameState = GameState.Intro;
		this.text.text.contents = "Tic-Tac-Toe\nClick To Play";

		this.currentPlayerGamePiece = GamePiece.X;
		this.nextPlayerGamePiece = GamePiece.O;
		this.boardState = [];
		this.light.light.color = { r: 1, g: 0.6, b: 0.3 };

		if (this.gamePieceActors !== undefined) {
			for (const actor of this.gamePieceActors) {
				actor.destroy();
			}
		}
		this.gamePieceActors = [];
	}

	private beginGameStatePlay() {
		MRE.log.info("app", "BeginGameState Play");
		this.gameState = GameState.Play;
		this.text.text.contents = "First Piece: " + GamePiece[this.currentPlayerGamePiece];
	}

	/**
	 * Generate keyframe data for a simple spin animation.
	 * @param duration The length of time in seconds it takes to complete a full revolution.
	 * @param axis The axis of rotation in local space.
	 */
	private generateSpinKeyframes(duration: number, axis: MRE.Vector3): Array<MRE.Keyframe<MRE.Quaternion>> {
		return [{
			time: 0 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 0)
		}, {
			time: 0.25 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
		}, {
			time: 0.5 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI)
		}, {
			time: 0.75 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 3 * Math.PI / 2)
		}, {
			time: 1 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 2 * Math.PI)
		}];
	}

	private GrowKeyframeData: Array<MRE.Keyframe<MRE.Vector3>> = [{
		time: 0,
		value: { x: 0.4, y: 0.4, z: 0.4 }
	}, {
		time: 0.3,
		value: { x: 0.5, y: 0.5, z: 0.5 }
	}];
}
