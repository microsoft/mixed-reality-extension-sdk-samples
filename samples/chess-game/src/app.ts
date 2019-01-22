/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:no-string-literal
// tslint:disable:max-classes-per-file

/*
    - I should be able to call CreateFromPrefab before the prefab is finished loading (it should wait on prefab.created())
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
    PrimitiveShape,
    Quaternion,
    QuaternionLike,
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
        rook: { rotation: Quaternion.FromEulerAngles(0, Math.PI, 0) },
        knight: { rotation: Quaternion.FromEulerAngles(0, -Math.PI / 2, 0) },
        bishop: { rotation: Quaternion.FromEulerAngles(0, -Math.PI / 2, 0) },
        queen: { rotation: Quaternion.FromEulerAngles(0, Math.PI, 0) },
        king: { rotation: Quaternion.FromEulerAngles(0, Math.PI, 0) },
        pawn: { rotation: Quaternion.FromEulerAngles(0, Math.PI, 0) },
    },
    white: {
        rook: { rotation: Quaternion.Identity() },
        knight: { rotation: Quaternion.FromEulerAngles(0, Math.PI / 2, 0) },
        bishop: { rotation: Quaternion.FromEulerAngles(0, Math.PI / 2, 0) },
        queen: { rotation: Quaternion.Identity() },
        king: { rotation: Quaternion.Identity() },
        pawn: { rotation: Quaternion.Identity() },
    }
};

const boardStep = 1.5;
const pieceScale = 0.08;
const baseHeight = 0;
const appScale = 0.4;
const markerScale = 1.05;
const hoverScale = 1.1;

/**
 * The main class of this app. All the logic goes here.
 */
export default class ChessGame {
    private game: Game;
    private sceneRoot: Actor;
    private checkMarker: Actor;
    private selectedMarker: Actor;
    private selectedActor: Actor;
    private assetGroups: { [id: string]: AssetGroup } = {};

    constructor(private context: Context, private baseUrl: string) {
        this.context.onStarted(() => this.started());
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private async started() {
        // Create the chess game.
        this.game = chess.createSimple();
        // Hook the 'check' event.
        this.game.on('check', (attack: Attack) => this.onCheck(attack));

        // Load all model prefabs.
        await this.preloadAllModels();

        // Create all the actors.
        await Promise.all([
            this.createRootObject(),
            this.createChessBoard(),
            this.createChessPieces(),
            this.createMoveMarkers(),
            this.createCheckMarker(),
            this.createSelectedMarker(),
            // this.makeTestObject(),
        ]);

        // Hook up event handlers. We do this after all actors are loaded because the event handlers
        // themselves reference other actors in the scene. It simplifies handler code if we can
        // assume that the actors are done getting created.
        this.addEventHandlers();
    }

    private async preloadAllModels() {
        const preloads: Array<Promise<AssetGroup>> = [];
        preloads.push(this.context.assetManager.loadGltf("white_bishop", `${this.baseUrl}/white_bishop.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_king", `${this.baseUrl}/white_king.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_knight", `${this.baseUrl}/white_knight.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_pawn", `${this.baseUrl}/white_pawn.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_queen", `${this.baseUrl}/white_queen.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_rook", `${this.baseUrl}/white_rook.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("white_square", `${this.baseUrl}/white_square.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_bishop", `${this.baseUrl}/black_bishop.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_king", `${this.baseUrl}/black_king.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_knight", `${this.baseUrl}/black_knight.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_pawn", `${this.baseUrl}/black_pawn.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_queen", `${this.baseUrl}/black_queen.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_rook", `${this.baseUrl}/black_rook.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("black_square", `${this.baseUrl}/black_square.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("move_marker", `${this.baseUrl}/move_marker.gltf`).then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("check_marker", `${this.baseUrl}/check_marker.gltf`).then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf("selected_marker", `${this.baseUrl}/selected_marker.gltf`).then(value => this.assetGroups[value.name] = value));
        await Promise.all(preloads);
    }

    private createRootObject() {
        // Create a root actor everything gets parented to. Offset from origin so the chess board
        // is centered on it.
        const sceneRootLoad = Actor.CreateEmpty(
            this.context, {
                actor: {
                    transform: {
                        position: { x: appScale * -boardStep * 3.5, z: appScale * -boardStep * 3.5 },
                        scale: { x: appScale, y: appScale, z: appScale }
                    }
                }
            });
        this.sceneRoot = sceneRootLoad.value;
        return sceneRootLoad;
    }

    private createChessBoard() {
        const loads: Array<ForwardPromise<Actor>> = [];
        const status = this.game.getStatus() as Status;
        let i = 0;
        let p = 0;
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            for (const rank of [1, 2, 3, 4, 5, 6, 7, 8]) {
                const position = this.coordinate({ file, rank });
                position.y = baseHeight;
                const side = ((i % 2) === 0) ? 'white' : 'black';
                const prefab = this.assetGroups[`${side}_square`].prefabs.byIndex(0);
                const loadActor = Actor.CreateFromPrefab(this.context, {
                    prefabId: prefab.id,
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
            }
        }
        return loads;
    }

    private createChessPieces() {
        const loads: Array<ForwardPromise<Actor>> = [];
        const status = this.game.getStatus() as Status;
        for (const square of status.board.squares) {
            if (square.piece) {
                const position = new Vector3();
                position.copy(this.coordinate(square));
                position.y = baseHeight + 0.1;
                const side = modelConfigs[square.piece.side.name];
                const info = side[square.piece.type];
                const prefab = this.assetGroups[`${square.piece.side.name}_${square.piece.type}`].prefabs.byIndex(0);
                const loadActor = Actor.CreateFromPrefab(this.context, {
                    prefabId: prefab.id,
                    actor: {
                        name: `${square.piece.side.name}-${square.piece.type}`,
                        parentId: this.sceneRoot.id,
                        transform: {
                            position,
                            rotation: info.rotation,
                            scale: { x: pieceScale, y: pieceScale, z: pieceScale }
                        }
                    },
                    subscriptions: ['transform']
                });
                square.piece.actor = loadActor.value;
                loads.push(loadActor);

                square.piece.actor.createAnimation('hover', {
                    keyframes: [
                        {
                            time: 0,
                            value: { transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }
                        }, {
                            time: 0.25,
                            value: { transform: { scale: { x: pieceScale * hoverScale, y: pieceScale * hoverScale, z: pieceScale * hoverScale } } }
                        }, {
                            time: 0.5,
                            value: { transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }
                        },
                    ],
                    wrapMode: AnimationWrapMode.Loop
                });
            }
        }
        return loads;
    }

    private createMoveMarkers() {
        const loads: Array<ForwardPromise<Actor>> = [];
        const status = this.game.getStatus() as Status;
        for (const square of status.board.squares) {
            const position = new Vector3();
            position.copy(this.coordinate(square));
            position.y = 1000;
            const prefab = this.assetGroups['move_marker'].prefabs.byIndex(0);
            const loadActor = Actor.CreateFromPrefab(this.context, {
                prefabId: prefab.id,
                actor: {
                    name: 'move-marker',
                    parentId: this.sceneRoot.id,
                    transform: {
                        position,
                        scale: { x: markerScale, y: 1, z: markerScale }
                    }
                }
            });
            loads.push(loadActor);
            square.marker = loadActor.value;
        }
        return loads;
    }

    private createCheckMarker() {
        const prefab = this.assetGroups['check_marker'].prefabs.byIndex(0);
        const loadActor = Actor.CreateFromPrefab(this.context, {
            prefabId: prefab.id,
            actor: {
                name: 'check-marker',
                parentId: this.sceneRoot.id,
                transform: {
                    position: { x: 1, y: 999, z: 1 },
                    scale: { x: markerScale, y: 1, z: markerScale }
                }
            }
        });
        this.checkMarker = loadActor.value;
        return loadActor;
    }

    private createSelectedMarker() {
        const prefab = this.assetGroups['selected_marker'].prefabs.byIndex(0);
        const loadActor = Actor.CreateFromPrefab(this.context, {
            prefabId: prefab.id,
            actor: {
                name: 'selected-marker',
                parentId: this.sceneRoot.id,
                transform: {
                    position: { x: 0, y: 999, z: 0 },
                    scale: { x: markerScale, y: 1, z: markerScale }
                }
            }
        });
        this.selectedMarker = loadActor.value;
        return loadActor;
    }

    private makeTestObject() {
        const testObjLoad = Actor.CreatePrimitive(this.context, {
            definition: {
                shape: PrimitiveShape.Box
            },
            actor: {
                parentId: this.sceneRoot.id,
                transform: {
                    position: {
                        x: boardStep * 3.5,
                        y: 4,
                        z: boardStep * 3.5
                    }
                }
            }
        });

        setInterval(() => {
            // Random point on unit sphere.
            const θ = Math.random() * 2 * Math.PI;
            const z = Math.cos(θ);
            const x = Math.sqrt(1 - z * z) * Math.cos(θ);
            const y = Math.sqrt(1 - z * z) * Math.sin(θ);
            const axis = new Vector3(x, y, z);
            // Random rotation around picked axis.
            const rotation = Quaternion.RotationAxis(axis, Math.random() * 2 * Math.PI);
            // Random ease curve.
            const easeCurveKeys = Object.keys(AnimationEaseCurves);
            const easeIndex = Math.floor(Math.random() * easeCurveKeys.length);
            const easeCurveKey = easeCurveKeys[easeIndex];
            // Animation test object's rotation.
            testObjLoad.value.animateTo({ transform: { rotation } }, 1.0, (AnimationEaseCurves as any)[easeCurveKey]);
        }, 1300);
        return testObjLoad;
    }

    private addEventHandlers() {
        const status = this.game.getStatus() as Status;
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
        this.showCheckMarker(attack.kingSquare);
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
                    this.hideMoveMarkers();
                    this.hideCheckMarker();
                    const prevBoard = this.readOccupiedBoard(status);
                    const result = this.game.move(move.src, destSquare);
                    const newStatus = this.game.getStatus() as Status;
                    const newBoard = this.readOccupiedBoard(newStatus);
                    this.animateActorMovements(prevBoard, newBoard);
                    this.hideSelectedMarker();
                    this.selectedActor = null;
                    if (newStatus.isCheckmate) {
                        console.log("checkmate");
                    } else if (newStatus.isCheck) {
                        //
                    } else if (newStatus.isRepetition) {
                        //
                    } else if (newStatus.isStalemate) {
                        //
                    }
                } else {
                    this.deselectPiece();
                }
            } else {
                this.deselectPiece();
            }
        }
    }

    private hideSelectedMarker() {
        this.selectedMarker.transform.position.y = 999;
    }

    private startHoverPiece(userId: string, actor: Actor) {
        if (this.selectedActor !== actor) {
            actor.setAnimationState('hover', { time: 0, speed: 1, enabled: true });
            actor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        }
        this.showMoveMarkers(actor);
    }

    private stopHoverPiece(userId: string, actor: Actor) {
        if (this.selectedActor !== actor) {
            actor.setAnimationState('hover', { time: 0, enabled: false });
            actor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        }
        this.showMoveMarkers(null);
    }

    private clickOnPiece(userId: string, actor: Actor) {
        if (this.selectedActor === actor) {
            // Toggle selected state.
            return this.deselectPiece();
        }
        if (this.isValidTarget(this.selectedActor, actor)) {
            // If this piece is a valid target, pipe to the `clickOnSquare` handler.
            const square = this.squareForActor(actor);
            return this.clickOnSquare(userId, square.actor);
        }
        if (this.selectedActor) {
            // Stop all hover animations on the selected actor.
            this.selectedActor.setAnimationState('hover', { time: 0, enabled: false });
            this.selectedActor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        }
        // Set the new selected actor.
        this.selectedActor = actor;
        actor.setAnimationState('hover', { time: 0, enabled: false });
        actor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        this.showSelectedMarker();
        this.showMoveMarkers(actor);
    }

    private deselectPiece() {
        this.selectedActor.setAnimationState('hover', { time: 0, enabled: false });
        this.selectedActor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        this.hideSelectedMarker();
        this.hideMoveMarkers();
        this.selectedActor = null;
    }

    private showSelectedMarker() {
        this.hideSelectedMarker();
        if (this.selectedActor) {
            const square = this.squareForActor(this.selectedActor);
            const coord = this.coordinate(square);
            coord.y = baseHeight + 0.1;
            this.selectedMarker.transform.position.copy(coord);
        }
    }

    private showValidMoves(moveSets: ValidMove[]) {
        for (const moveSet of moveSets || []) {
            if (moveSet) {
                for (const square of moveSet.squares) {
                    const marker = square.marker;
                    marker.transform.position.y = baseHeight + 0.1;
                }
            }
        }
    }

    private isValidTarget(sourceActor: Actor, targetActor: Actor) {
        if (sourceActor && targetActor) {
            const targetSquare = this.squareForActor(targetActor);
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
            return status.validMoves.filter(item => item.src.piece.actor.id === actor.id).shift();
        }
    }

    private hideMoveMarkers() {
        const status = this.game.getStatus() as Status;
        for (const square of status.board.squares) {
            const marker = square.marker;
            marker.transform.position.y = 1000;
        }
    }

    private hideCheckMarker() {
        this.checkMarker.transform.position.y = 999;
    }

    private showCheckMarker(square: Square) {
        this.checkMarker.transform.position = square.marker.transform.position;
        this.checkMarker.transform.position.y = baseHeight + 0.1;
    }

    private coordinate(coord: Coordinate): Partial<Vector3Like> {
        // Given a file and rank, return the coordinates of the center of the corresponding square.
        const fileIndices: { [id: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
        const file = fileIndices[coord.file];
        const rank = coord.rank - 1;
        const x = file * boardStep;
        const z = rank * boardStep;
        return { x, z };
    }

    private squareForActor(actor: Actor): Square {
        const status = this.game.getStatus() as Status;
        return status.board.squares.filter(item => item.piece && item.piece.actor.id === actor.id).shift();
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
                if (newSquare.rank !== oldSquare.rank || newSquare.file !== oldSquare.file) {
                    // Piece moved.
                    movements.push({
                        actor,
                        oldSquare,
                        newSquare
                    });
                }
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
            this.animateMovement(movement.actor, movement.newSquare);
        }
        for (const capture of captures) {
            this.animateCapture(capture.actor);
        }
    }

    private async animateMovement(actor: Actor, dst: Square) {
        const moveSpeed = 0.3;
        const position = new Vector3();
        position.copy(this.coordinate(dst));
        position.y = actor.transform.position.y;
        const diff = position.subtract(actor.transform.position);
        const length = diff.length();
        actor.animateTo({ transform: { position } }, moveSpeed * length, AnimationEaseCurves.EaseInOutSine);
        actor.animateTo({ transform: { scale: { x: pieceScale, y: pieceScale, z: pieceScale } } }, 0.1, AnimationEaseCurves.Linear);
        // Animate a slight tilt in the direction of movement.
        // const square = this.squareForActor(actor);
        // const config = modelConfigs[square.piece.side.name][square.piece.type];
        // const direction = toCoord.subtract(actor.transform.position);
        // const left = Vector3.Cross(direction, Vector3.Up());
        // const rotation = Quaternion.RotationAxis(left, -Math.PI / 8).multiply(config.rotation);
        // actor.animateTo({ transform: { rotation } }, 0.25, AnimationEaseCurves.EaseOutSine)
        //     .then(() => { actor.animateTo({ transform: { rotation: config.rotation } }, 0.25, AnimationEaseCurves.EaseInSine); });
    }

    private async animateCapture(actor: Actor) {
        actor.animateTo({ transform: { scale: { y: 0 } } }, 1.0, AnimationEaseCurves.EaseInSine)
            .then(() => actor.destroy());
    }
}
