/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:no-string-literal
// tslint:disable:max-classes-per-file

/**
 *  *** Notes ***
 */

import {
	Actor,
	AnimationEaseCurves,
	AnimationWrapMode,
	Asset,
	AssetContainer,
	ButtonBehavior,
	Context,
	DegreesToRadians,
	PrimitiveShape,
	Quaternion,
	QuaternionLike,
	User,
	Vector3,
	Vector3Like,
} from '@microsoft/mixed-reality-extension-sdk';

// tslint:disable:no-var-requires
const chess = require('chess');

type Game = {
	move: (src: Coordinate, dst: Coordinate, promo?: string) => MoveResult;
	on: (even: 'check', handler: (attack: Attack) => any) => any;
	getStatus: () => Status;
	getCurrentSide: () => string;
};

type Side = {
	name: 'black' | 'white';
};

type Piece = {
	moveCount: number;
	notation: string;
	side: Side;
	type: string;
	actor: Actor;
};

type Status = {
	board: Board;
	isCheck: boolean;
	isCheckmate: boolean;
	isRepetition: boolean;
	isStalemate: boolean;
	validMoves: ValidMove[];
};

type ValidMove = {
	src: Square;
	squares: Square[];
};

type Board = {
	squares: Square[];
};

type Coordinate = {
	file: string;
	rank: number;
};

type Square = Coordinate & {
	actor: SquareActor;
	piece: Piece;
	marker: Actor;
};

type Move = {
	algebraic: string;
	capturedPiece: Piece;
	castle: boolean;
	enPassant: boolean;
	postSquare: Square;
	prevSquare: Square;
};

type Attack = {
	attackingSquare: Square;
	kingSquare: Square;
};

type MoveResult = {
	move: Move;
	undo: Function;
};

type ModelConfig = {
	rotation: Quaternion;
};

type SquareActor = Actor & Coordinate;

// Chess piece configuraton (rotation, etc.)
const modelConfigs: { [id: string]: { [id: string]: ModelConfig } } = {
	black: {
		rook: { rotation: Quaternion.Identity() },
		knight: { rotation: Quaternion.Identity() },
		bishop: { rotation: Quaternion.Identity() },
		queen: { rotation: Quaternion.Identity() },
		king: { rotation: Quaternion.Identity() },
		pawn: { rotation: Quaternion.Identity() },
	},
	white: {
		rook: { rotation: Quaternion.Identity() },
		knight: { rotation: Quaternion.FromEulerAngles(0, -Math.PI, 0) },
		bishop: { rotation: Quaternion.Identity() },
		queen: { rotation: Quaternion.Identity() },
		king: { rotation: Quaternion.Identity() },
		pawn: { rotation: Quaternion.Identity() },
	}
};

// The dimension of a square on the chessboard.
const boardStep = 0.0382;
// Height of the top of the chessboard.
const baseHeight = 0;
// Global app scale (scale of the root object that everything is parented to).
const appScale = { x: 5, y: 5, z: 5 };

/**
 * The main class of this app. All the logic goes here.
 */
export default class ChessGame {
	private game: Game;
	private sceneRoot: Actor;
	private boardOffset: Actor;
	private chessboard: Actor;
	private checkMarker: Actor;
	private assets: AssetContainer;
	private preloads: { [id: string]: Asset[] } = {};

	constructor(private context: Context, private baseUrl: string) {
		this.assets = new AssetContainer(this.context);
		this.context.onStarted(this.started);
		this.context.onUserJoined(this.userJoined);
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started = async () => {
		// Create the chess game.
		this.game = chess.createSimple();
		// Hook the 'check' event.
		this.game.on('check', (attack: Attack) => this.onCheck(attack));

		// Load all model prefabs.
		await this.preloadAllModels();

		// Create all the actors.
		await Promise.all([
			this.createRootObject(),
			this.createChessboard(),
			this.createChessPieces(),
			this.createMoveMarkers(),
			this.createCheckMarker(),
			this.createJoinButtons(),
		]);

		// Hook up event handlers.
		// Do this after all actors are loaded because the event handlers themselves reference other actors in the
		// scene. It simplifies handler code if we can assume that the actors are loaded.
		this.addEventHandlers();
	}

	private userJoined = (user: User) => {
		console.log(user.properties);
	}

	private async preloadAllModels() {
		const preloads: Array<Promise<Asset[]>> = [];
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/Chessboard_Main.gltf`, 'mesh').then(value => this.preloads['chessboard'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Bishop_White.gltf`, 'mesh').then(value => this.preloads['white-bishop'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_King_White.gltf`, 'mesh').then(value => this.preloads['white-king'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Knight_White.gltf`, 'mesh').then(value => this.preloads['white-knight'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Pawn_White.gltf`, 'mesh').then(value => this.preloads['white-pawn'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Queen_White.gltf`, 'mesh').then(value => this.preloads['white-queen'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Rook_White.gltf`, 'mesh').then(value => this.preloads['white-rook'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Bishop_Black.gltf`, 'mesh').then(value => this.preloads['black-bishop'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_King_Black.gltf`, 'mesh').then(value => this.preloads['black-king'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Knight_Black.gltf`, 'mesh').then(value => this.preloads['black-knight'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Pawn_Black.gltf`, 'mesh').then(value => this.preloads['black-pawn'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Queen_Black.gltf`, 'mesh').then(value => this.preloads['black-queen'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/ChessPieces_Rook_Black.gltf`, 'mesh').then(value => this.preloads['black-rook'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/UI_Glow_Blue.gltf`, 'mesh').then(value => this.preloads['move-marker'] = value));
		preloads.push(this.assets.loadGltf(`${this.baseUrl}/UI_Glow_Orange.gltf`, 'mesh').then(value => this.preloads['check-marker'] = value));
		await Promise.all(preloads);
	}

	private createRootObject() {
		// Create a root actor everything gets parented to. Offset from origin so the chess board
		// is centered on it.
		this.sceneRoot = Actor.CreateEmpty(
			this.context, {
				actor: {
					transform: {
						local: {
							scale: appScale
						}
					}
				}
			});
		return this.sceneRoot.created();
	}

	private createChessboard() {
		const loads: Array<Promise<void>> = [];
		this.chessboard = Actor.CreateFromPrefab(this.context, {
			prefabId: this.preloads['chessboard'][0].prefab.id,
			actor: {
				name: "chessboard",
				parentId: this.sceneRoot.id,
			}
		});
		loads.push(this.chessboard.created());

		this.boardOffset = Actor.CreateEmpty(this.context, {
			actor: {
				name: "board-offset",
				parentId: this.sceneRoot.id,
				transform: {
					local: {
						position: { x: 0.135, z: 0.135 }
					}
				}
			}
		});
		loads.push(this.boardOffset.created());

		const status = this.game.getStatus() as Status;
		for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
			for (const rank of [1, 2, 3, 4, 5, 6, 7, 8]) {
				const position = this.coordinate({ file, rank });
				const actor = Actor.CreateEmpty(this.context, {
					actor: {
						name: `square-${file}${rank}`,
						parentId: this.boardOffset.id,
						transform: { local: { position } },
						subscriptions: ['transform']
					}
				});
				loads.push(actor.created());

				const squareActor = actor as any as SquareActor;
				squareActor.file = file;
				squareActor.rank = rank;

				const square = status.board.squares.filter(item => item.file === file && item.rank === rank).shift();
				square.actor = squareActor;
			}
		}
		return loads;
	}

	private createChessPieces() {
		const loads: Array<Promise<void>> = [];
		const status = this.game.getStatus() as Status;
		for (const square of status.board.squares) {
			if (square.piece) {
				const side = modelConfigs[square.piece.side.name];
				const info = side[square.piece.type];
				const name = `${square.piece.side.name}-${square.piece.type}`;
				const position = new Vector3();
				position.copy(this.coordinate(square));
				const prefab = this.preloads[`${square.piece.side.name}-${square.piece.type}`][0].prefab;
				const actor = Actor.CreateFromPrefab(this.context, {
					prefabId: prefab.id,
					actor: {
						name,
						parentId: this.boardOffset.id,
						transform: { local: { position, rotation: info.rotation } },
						subscriptions: ['transform']
					}
				});
				square.piece.actor = actor;
				loads.push(actor.created());
			}
		}
		return loads;
	}

	private createMoveMarkers() {
		const loads: Array<Promise<void>> = [];
		const status = this.game.getStatus() as Status;
		for (const square of status.board.squares) {
			const position = new Vector3();
			position.copy(this.coordinate(square));
			position.y = 1000;
			const prefab = this.preloads['move-marker'][0].prefab;
			const actor = Actor.CreateFromPrefab(this.context, {
				prefabId: prefab.id,
				actor: {
					name: 'move-marker',
					parentId: this.boardOffset.id,
					transform: { local: { position } }
				}
			});
			square.marker = actor;
			loads.push(actor.created());
		}
		return loads;
	}

	private createCheckMarker() {
		const prefab = this.preloads['check-marker'][0].prefab;
		const actor = Actor.CreateFromPrefab(this.context, {
			prefabId: prefab.id,
			actor: {
				name: 'check-marker',
				parentId: this.boardOffset.id,
				transform: { local: { position: { x: 1, y: 999, z: 1 } } }
			}
		});
		this.checkMarker = actor;
		return actor.created();
	}

	private createJoinButtons() {

	}

	private addEventHandlers() {
		const status = this.game.getStatus() as Status;
		// Add input handlers to chess pieces.
		status.board.squares.map(square => square.piece).filter(piece => piece).forEach(piece => {
			const actor = piece.actor;
			const button = actor.setBehavior(ButtonBehavior);
			button.onHover('enter', (user) => this.startHoverPiece(user.id, actor));
			button.onHover('exit', (user) => this.stopHoverPiece(user.id, actor));
			actor.onGrab('begin', (user) => this.onDragBegin(user.id, actor));
			actor.onGrab('end', (user) => this.onDragEnd(user.id, actor));
			actor.grabbable = true;
		});
	}

	private nearestSquare(position: Vector3): Square {
		const distance = (square: Square) => Vector3.Distance(
			new Vector3(position.x, 0, position.z),
			new Vector3(
				square.actor.transform.app.position.x, 0,
				square.actor.transform.app.position.z));

		const status = this.game.getStatus() as Status;
		const sorted = [...status.board.squares].sort((a, b) => distance(a) - distance(b));
		return sorted.shift();
	}

	private onCheck(attack: Attack) {
		this.showCheckMarker(attack.kingSquare);
	}

	public onDragBegin(userId: string, actor: Actor) {
		this.showMoveMarkers(actor);
	}

	private onDragEnd(userId: string, actor: Actor) {
		this.hideMoveMarkers();
		this.hideCheckMarker();
		const status = this.game.getStatus() as Status;
		// Get populated squares for current board state.
		const prevBoard = this.readOccupiedBoard(status);
		// Get the nearest square to the drop location.
		const dropSquare = this.nearestSquare(actor.transform.app.position);
		if (dropSquare) {
			// Get valid moves for this piece.
			const move = status.validMoves.filter(item => item.src.piece.actor.id === actor.id).shift();
			if (move) {
				const destSquare = move.squares.filter(item => item.file === dropSquare.file && item.rank === dropSquare.rank).shift();
				if (destSquare) {
					// Move the piece.
					const result = this.game.move(move.src, destSquare);
				}
			}
		}
		// Get populated squares for new board state.
		const newStatus = this.game.getStatus() as Status;
		const newBoard = this.readOccupiedBoard(newStatus);
		// Move pieces to match new positions on board.
		this.animateActorMovements(prevBoard, newBoard).catch();
		if (newStatus.isCheckmate) {
			console.log("checkmate");
		} else if (newStatus.isCheck) {
			//
		} else if (newStatus.isRepetition) {
			//
		} else if (newStatus.isStalemate) {
			//
		}
	}

	private startHoverPiece(userId: string, actor: Actor) {
		this.showMoveMarkers(actor);
	}

	private stopHoverPiece(userId: string, actor: Actor) {
		this.showMoveMarkers(null);
	}

	private showValidMoves(moveSets: ValidMove[]) {
		for (const moveSet of moveSets || []) {
			if (moveSet) {
				for (const square of moveSet.squares) {
					const marker = square.marker;
					marker.transform.local.position.y = baseHeight;
				}
			}
		}
	}

	private showMoveMarkers(actor: Actor) {
		// Show move markers for this actor and for the selected actor.
		this.hideMoveMarkers();
		const actorMoveSet = this.validMovesForActor(actor);
		this.showValidMoves([actorMoveSet]);
	}

	private validMovesForActor(actor: Actor) {
		if (actor) {
			const status = this.game.getStatus() as Status;
			return status.validMoves.filter(item => item.src.piece.actor.id === actor.id).shift();
		}
	}

	private hideMoveMarkers() {
		const status = this.game.getStatus() as Status;
		for (const square of status.board.squares) {
			const marker = square.marker;
			marker.transform.local.position.y = 1000;
		}
	}

	private hideCheckMarker() {
		this.checkMarker.transform.local.position.y = 999;
	}

	private showCheckMarker(square: Square) {
		this.checkMarker.transform.local.position = square.marker.transform.local.position;
		this.checkMarker.transform.local.position.y = baseHeight + 0.1;
	}

	private coordinate(coord: Coordinate): Vector3 {
		// Given a file and rank, return the coordinates of the center of the corresponding square.
		const fileIndices: { [id: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
		const file = fileIndices[coord.file];
		const rank = coord.rank - 1;
		const x = file * -boardStep;
		const z = rank * -boardStep;
		return new Vector3(x, baseHeight, z);
	}

	// Returns a sparse board, only occupied squares.
	private readOccupiedBoard(status: Status): Board {
		const board: Board = {
			squares: []
		};
		status.board.squares.forEach(square => {
			if (square.piece) {
				board.squares.push({
					file: square.file,
					rank: square.rank,
					piece: square.piece,
					actor: square.actor,
					marker: square.marker,
				});
			}
		});
		return board;
	}

	private async animateActorMovements(oldBoard: Board, newBoard: Board) {
		// Diff old and new board states, and move the pieces around to match.
		const oldSquares: { [id: string]: Square } = {};
		const newSquares: { [id: string]: Square } = {};
		oldBoard.squares.forEach(square => oldSquares[square.piece.actor.id] = square);
		newBoard.squares.forEach(square => newSquares[square.piece.actor.id] = square);

		type Change = {
			actor: Actor;
			oldSquare: Square;
			newSquare: Square;
		};

		const movements: Change[] = [];
		const captures: Change[] = [];

		for (const key of Object.keys(oldSquares)) {
			const oldSquare = oldSquares[key];
			const newSquare = newSquares[key];
			const actor = this.context.actor(key);
			if (newSquare) {
				// Piece moved.
				movements.push({
					actor,
					oldSquare,
					newSquare
				});
			} else {
				// Piece was captured.
				captures.push({
					actor,
					oldSquare,
					newSquare: null
				});
			}
		}

		for (const movement of movements) {
			this.animateMovement(movement.actor, movement.newSquare).catch();
		}
		for (const capture of captures) {
			this.animateCapture(capture.actor).catch();
		}
	}

	private async animateMovement(actor: Actor, dst: Square) {
		const moveSpeed = 3;
		const position = new Vector3();
		position.copy(this.coordinate(dst));
		position.y = actor.transform.local.position.y;
		const diff = position.subtract(actor.transform.local.position);
		const length = diff.length();
		const [side, type] = actor.name.split('-');
		const sideConfig = modelConfigs[side];
		const modelConfig = sideConfig[type];
		actor.animateTo({
			transform: {
				local: {
					position,
					rotation: modelConfig.rotation
				}
			}
		}, moveSpeed * length, AnimationEaseCurves.EaseInOutSine);
	}

	private async animateCapture(actor: Actor) {
		actor.animateTo({ transform: { local: { scale: { y: 0 } } } }, 1.0, AnimationEaseCurves.EaseInSine);
		await delay(1000);
		actor.destroy();
	}
}

function delay(milliseconds: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(() => resolve(), milliseconds);
	});
}
