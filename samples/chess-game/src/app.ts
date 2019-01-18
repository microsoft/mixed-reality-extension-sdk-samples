/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:no-string-literal
// tslint:disable:max-classes-per-file

/**
 * 1. I don't understand the need so Asset group name in AssetManager.loadGltf.
 *    Why can't I load additional gltfs into a group?
 * 2. Can I add a collider to a prefab?
 * 3. Prefabs API is too complex.
 */

import {
    Actor,
    AnimationEaseCurves,
    AnimationWrapMode,
    AssetGroup,
    ButtonBehavior,
    Context,
    DegreesToRadians,
    ForwardPromise,
    Quaternion,
    Vector3,
    Vector3Like,
} from '@microsoft/mixed-reality-extension-sdk';

// tslint:disable:no-var-requires
const chess = require('chess');

type Side = {
    name: 'black' | 'white';
};

type Piece = {
    moveCount: number;
    notation: string;
    side: Side;
    type: string;
    actor: Actor;
    api: PieceAPI;
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

type AlgebraicCoord = {
    file: string;
    rank: number;
};

type Square = AlgebraicCoord & {
    actor: SquareActor;
    piece: Piece;
    marker: Actor;
    api: SquareAPI;
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
    rotation: number;
};

type SquareActor = Actor & AlgebraicCoord;

class PieceAPI {
    constructor(private app: ChessGame, private piece: Piece) {
    }

    public selected() { }
}

class SquareAPI {
    constructor(private app: ChessGame, private square: Square) {
    }
}

// Chess piece configuraton (rotation, etc.)
const modelConfigs: { [id: string]: { [id: string]: ModelConfig } } = {
    black: {
        rook: { rotation: 0 },
        knight: { rotation: -90 * DegreesToRadians },
        bishop: { rotation: -90 * DegreesToRadians },
        queen: { rotation: 0 },
        king: { rotation: 0 },
        pawn: { rotation: 0 },
    },
    white: {
        rook: { rotation: 0 },
        knight: { rotation: 90 * DegreesToRadians },
        bishop: { rotation: 90 * DegreesToRadians },
        queen: { rotation: 0 },
        king: { rotation: 0 },
        pawn: { rotation: 0 },
    }
};

const boardStep = 1.5;
const pieceScale = 0.08;
const baseHeight = 0.5;

/**
 * The main class of this app. All the logic goes here.
 */
export default class ChessGame {
    public game: any;
    public sceneRoot: Actor;
    public checkMarker: Actor;
    public selectedMarker: Actor;
    public selectedActor: Actor;

    constructor(private context: Context, private baseUrl: string) {
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private async started() {
        // Create the chess game.
        this.game = chess.createSimple();
        this.game.on('check', (attack: Attack) => this.onCheck(attack));
        const status = this.game.getStatus() as Status;

        // Preload all models.
        const assetGroups: { [id: string]: AssetGroup } = {};
        const preloads: Array<Promise<AssetGroup>> = [];
        preloads.push(this.context.assets.loadGltf("white_bishop", `${this.baseUrl}/white_bishop.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_king", `${this.baseUrl}/white_king.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_knight", `${this.baseUrl}/white_knight.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_pawn", `${this.baseUrl}/white_pawn.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_queen", `${this.baseUrl}/white_queen.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_rook", `${this.baseUrl}/white_rook.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("white_square", `${this.baseUrl}/white_square.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_bishop", `${this.baseUrl}/black_bishop.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_king", `${this.baseUrl}/black_king.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_knight", `${this.baseUrl}/black_knight.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_pawn", `${this.baseUrl}/black_pawn.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_queen", `${this.baseUrl}/black_queen.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_rook", `${this.baseUrl}/black_rook.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("black_square", `${this.baseUrl}/black_square.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("move_marker", `${this.baseUrl}/move_marker.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("check_marker", `${this.baseUrl}/check_marker.gltf`, 'box').then(value => assetGroups[value.name] = value));
        preloads.push(this.context.assets.loadGltf("selected_marker", `${this.baseUrl}/selected_marker.gltf`, 'box').then(value => assetGroups[value.name] = value));
        // Wait for all preloads to complete.
        await Promise.all(preloads);

        // Keep a list of all the things we're loading.
        const loads: Array<ForwardPromise<Actor>> = [];

        // Create a root actor everything gets parented to.
        const sceneRootLoad = Actor.CreateEmpty(this.context);
        loads.push(sceneRootLoad);
        this.sceneRoot = sceneRootLoad.value;

        // Create the chess board.
        let i = 0;
        let p = 0;
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            for (const rank of [1, 2, 3, 4, 5, 6, 7, 8]) {
                const position = this.coordinate({ file, rank });
                position.y = baseHeight;
                const side = ((i % 2) === 0) ? 'white' : 'black';
                const prefab = assetGroups[`${side}_square`].prefabs.byIndex(0);
                const loadActor = Actor.CreateFromPrefab(this.context, {
                    prefabId: prefab.id,
                    enableColliders: true,
                    actor: {
                        name: `square-${file}${rank}`,
                        parentId: this.sceneRoot.id,
                        transform: {
                            position
                        }
                    },
                    subscriptions: ['transform']
                });
                loads.push(loadActor);

                i += 1; p += 1;
                if ((p % 8) === 0) i += 1;

                const squareActor = loadActor.value as any as SquareActor;
                squareActor.file = file;
                squareActor.rank = rank;

                const square = status.board.squares.filter(item => item.file === file && item.rank === rank).shift();
                square.actor = squareActor;
                square.api = new SquareAPI(this, square);
            }
        }

        // Create the chess pieces.
        for (const square of status.board.squares) {
            if (square.piece) {
                const position = new Vector3();
                position.copy(this.coordinate(square));
                position.y = baseHeight + 0.1;
                const side = modelConfigs[square.piece.side.name];
                const info = side[square.piece.type];
                const prefab = assetGroups[`${square.piece.side.name}_${square.piece.type}`].prefabs.byIndex(0);
                const loadActor = Actor.CreateFromPrefab(this.context, {
                    prefabId: prefab.id,
                    enableColliders: true,
                    actor: {
                        name: `${square.piece.side.name}-${square.piece.type}`,
                        parentId: this.sceneRoot.id,
                        transform: {
                            position,
                            rotation: Quaternion.FromEulerAngles(0, info.rotation, 0),
                            scale: { x: pieceScale, y: pieceScale, z: pieceScale }
                        }
                    },
                    subscriptions: ['transform']
                });
                square.piece.actor = loadActor.value;
                square.piece.api = new PieceAPI(this, square.piece);
                loads.push(loadActor);

                square.piece.actor.createAnimation('hover', {
                    keyframes: [
                        {
                            time: 0,
                            value: { transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }
                        },
                        {
                            time: 0.25,
                            value: { transform: { scale: { x: pieceScale * 1.2, y: pieceScale * 1.2, z: pieceScale * 1.2 } } }
                        },
                        {
                            time: 0.5,
                            value: { transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }
                        },
                    ],
                    wrapMode: AnimationWrapMode.Loop
                });
            }
        }

        // Create the move markers.
        for (const square of status.board.squares) {
            const position = new Vector3();
            position.copy(this.coordinate(square));
            position.y = 1000;
            const prefab = assetGroups['move_marker'].prefabs.byIndex(0);
            const loadActor = Actor.CreateFromPrefab(this.context, {
                prefabId: prefab.id,
                actor: {
                    name: 'move-marker',
                    parentId: this.sceneRoot.id,
                    transform: {
                        position
                    }
                }
            });
            loads.push(loadActor);
            square.marker = loadActor.value;
        }

        // Create the check marker.
        {
            const prefab = assetGroups['check_marker'].prefabs.byIndex(0);
            const loadActor = Actor.CreateFromPrefab(this.context, {
                prefabId: prefab.id,
                actor: {
                    name: 'check-marker',
                    parentId: this.sceneRoot.id,
                    transform: {
                        position: { x: 1, y: 999, z: 1 }
                    }
                }
            });
            loads.push(loadActor);
            this.checkMarker = loadActor.value;
        }

        // Create the selected marker.
        {
            const prefab = assetGroups['selected_marker'].prefabs.byIndex(0);
            const loadActor = Actor.CreateFromPrefab(this.context, {
                prefabId: prefab.id,
                actor: {
                    name: 'selected-marker',
                    parentId: this.sceneRoot.id,
                    transform: {
                        position: { x: 0, y: 999, z: 0 }
                    }
                }
            });
            loads.push(loadActor);
            this.selectedMarker = loadActor.value;
        }

        // Wait for all actors to finish getting created.
        await Promise.all(loads);

        // Add event handlers to actors.
        for (const square of status.board.squares) {
            // Add event handlers to square.
            {
                const behavior = square.actor.setBehavior(ButtonBehavior);
                behavior.onClick('pressed', (userId: string) => this.clickOnSquare(userId, square.actor));
            }
            // Add event handlers to piece.
            if (square.piece) {
                const actor = square.piece.actor;
                const behavior = actor.setBehavior(ButtonBehavior);
                behavior.onHover('enter', (userId: string) => this.startHoverPiece(userId, actor));
                behavior.onHover('exit', (userId: string) => this.stopHoverPiece(userId, actor));
                behavior.onClick('pressed', (userId: string) => this.clickOnPiece(userId, actor));
            }
        }
    }

    private onCheck(attack: Attack) {
        console.log("check", attack);
    }

    private clickOnSquare(userId: string, actor: SquareActor) {
        // If we have a selected piece, and this is a valid move for that piece, then make the move.
        if (this.selectedActor) {
            const status = this.game.getStatus() as Status;
            const move = status.validMoves.filter(item => item.src.piece.actor.id === this.selectedActor.id).shift();
            if (move) {
                const destSquare = move.squares.filter(item =>
                    item.file === actor.file &&
                    item.rank === actor.rank).shift();
                if (destSquare) {
                    const prevBoard = this.readOccupiedBoard(status);
                    const result = this.game.move(move.src, destSquare) as MoveResult;
                    const newStatus = this.game.getStatus() as Status;
                    const newBoard = this.readOccupiedBoard(newStatus);
                    this.animateActorMovements(prevBoard, newBoard);
                    this.hideSelectedMarker();
                    this.selectedActor = null;
                    if (newStatus.isCheckmate) {
                        //
                    } else if (newStatus.isCheck) {
                        //
                    } else if (newStatus.isRepetition) {
                        //
                    } else if (newStatus.isStalemate) {
                        //
                    }
                }
            }
        }
    }

    private hideSelectedMarker() {
        if (this.selectedMarker) {
            this.selectedMarker.transform.position.y = 999;
        }
    }

    private startHoverPiece(userId: string, actor: Actor) {
        console.log(`start hover. ${actor.name}`);
        if (this.selectedActor !== actor) {
            actor.setAnimationState('hover', { time: 0, speed: 1, enabled: true });
        }
        this.showMoveMarkers(actor);
    }

    private stopHoverPiece(userId: string, actor: Actor) {
        console.log(`stop hover. ${actor.name}`);
        if (this.selectedActor !== actor) {
            actor.setAnimationState('hover', { time: 0, enabled: false });
        }
        this.showMoveMarkers(null);
    }

    private clickOnPiece(userId: string, actor: Actor) {
        // Select the piece.
        if (this.selectedActor === actor) {
            return this.deselectPiece();
        }
        if (this.isValidTarget(this.selectedActor, actor)) {
            return;
        }
        if (this.selectedActor) {
            this.selectedActor.setAnimationState('hover', { time: 0, enabled: false });
        }
        this.selectedActor = actor;
        actor.setAnimationState('hover', { time: 0, enabled: false });
        this.showSelectedMarker();
        this.showMoveMarkers(actor);
    }

    private deselectPiece() {
        this.selectedActor.setAnimationState('hover', { time: 0, enabled: false });
        this.hideSelectedMarker();
        this.hideMoveMarkers();
        this.selectedActor = null;
    }

    private showSelectedMarker() {
        this.hideSelectedMarker();
        if (this.selectedActor) {
            const square = this.squareForActor(this.selectedActor);
            if (square) {
                const coord = this.coordinate(square);
                coord.y = baseHeight + 0.1;
                this.selectedMarker.transform.position = coord;
            }
        }
    }

    private showValidMoves(moveSets: ValidMove[]) {
        for (const moveSet of moveSets || []) {
            if (moveSet) {
                for (const square of moveSet.squares) {
                    const marker = square.marker;
                    if (marker) {
                        marker.transform.position.y = baseHeight + 0.1;
                    }
                }
            }
        }
    }

    private isValidTarget(sourceActor: Actor, targetActor: Actor) {
        if (sourceActor && targetActor) {
            const targetSquare = this.squareForActor(targetActor);
            if (targetSquare) {
                const validMove = this.validMovesForActor(this.selectedActor);
                if (validMove) {
                    for (const square of validMove.squares) {
                        if (square.file === targetSquare.file && square.rank === targetSquare.rank) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    private showMoveMarkers(actor: Actor) {
        // Show move markers for this actor and for the selected actor.
        this.hideMoveMarkers();
        const actorMoveSet = this.validMovesForActor(actor);
        const selectedActorMoveSet = this.validMovesForActor(this.selectedActor);
        this.showValidMoves([actorMoveSet, selectedActorMoveSet]);
    }

    private validMovesForActor(actor: Actor) {
        if (actor) {
            const status = this.game.getStatus() as Status;
            return status.validMoves.filter(item =>
                (actor && item.src.piece.actor.id === actor.id) ||
                (this.selectedActor && item.src.piece.actor.id === this.selectedActor.id)).shift();
        }
    }

    private hideMoveMarkers() {
        const status = this.game.getStatus() as Status;
        for (const square of status.board.squares) {
            const marker = square.marker;
            if (marker) {
                marker.transform.position.y = 1000;
            }
        }
    }

    private coordinate(coord: AlgebraicCoord): Partial<Vector3Like> {
        // Given a file and rank, return the coordinates of the center of the corresponding square.
        const fileIndices: { [id: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
        const file = fileIndices[coord.file];
        const rank = coord.rank - 1;
        const x = file * boardStep;
        const z = rank * boardStep;
        return { x, z };
    }

    private squareForActor(actor: Actor): AlgebraicCoord {
        const status = this.game.getStatus() as Status;
        return status.board.squares.filter(item => item.piece && item.piece.actor.id === this.selectedActor.id).shift();
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
                    api: square.api
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
            oldCoord: AlgebraicCoord;
            newCoord: AlgebraicCoord;
        };

        const movements: Change[] = [];
        const captures: Change[] = [];

        for (const key of Object.keys(oldSquares)) {
            const oldSquare = oldSquares[key];
            const newSquare = newSquares[key];
            const actor = this.context.actor(key);
            if (newSquare) {
                if (newSquare.rank !== oldSquare.rank || newSquare.file !== oldSquare.file) {
                    // Piece moved.
                    movements.push({
                        actor,
                        oldCoord: {
                            file: oldSquare.file,
                            rank: oldSquare.rank
                        },
                        newCoord: {
                            file: newSquare.file,
                            rank: newSquare.rank
                        }
                    });
                }
            } else {
                // Piece was captured.
                captures.push({
                    actor,
                    oldCoord: {
                        file: oldSquare.file,
                        rank: oldSquare.rank
                    },
                    newCoord: null
                });
            }
        }

        for (const movement of movements) {
            this.animateMovement(movement.actor, movement.newCoord);
        }
        for (const capture of captures) {
            this.animateCapture(capture.actor);
        }
    }

    private async animateMovement(actor: Actor, dest: AlgebraicCoord) {
        const toCoord = new Vector3();
        toCoord.copy(this.coordinate(dest));
        toCoord.y = actor.transform.position.y;
        // actor.animateTo({ transform: { rotation: Quaternion.RotationAxis(actor.transform.right, -Math.PI / 8) } }, 0.5, AnimationEaseCurves.EaseInOutBack);
        actor.animateTo({ transform: { position: toCoord } }, 1.0, AnimationEaseCurves.EaseInOutSine);
    }

    private async animateCapture(actor: Actor) {
        actor.animateTo({ transform: { scale: { x: pieceScale, y: 0, z: pieceScale } } }, 1.0, AnimationEaseCurves.EaseInSine)
            .then(() => actor.destroy());
    }
}
