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
 *  - I should be able to call CreateFromPrefab before the prefab is finished loading (it should wait on prefab.created())
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

const boardStep = 0.0382;
const baseHeight = 0;
const appScale = { x: 5, y: 5, z: 5 };
const hoverScale = { x: 1.05, y: 1.05, z: 1.05 };
const unitScale = { x: 1, y: 1, z: 1 };
const hoverCurve = AnimationEaseCurves.EaseOutSine;

/**
 * The main class of this app. All the logic goes here.
 */
export default class ChessGame {
    private game: Game;
    private sceneRoot: Actor;
    private boardOffset: Actor;
    private chessboard: Actor;
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
            this.createChessboard(),
            this.createChessPieces(),
            this.createMoveMarkers(),
            this.createCheckMarker(),
            this.createSelectedMarker(),
            this.createJoinButtons(),
        ]);

        // Hook up event handlers.
        // Do this after all actors are loaded because the event handlers themselves reference other actors in the
        // scene. It simplifies handler code if we can assume that the actors are loaded.
        this.addEventHandlers();
    }

    private async preloadAllModels() {
        const preloads: Array<Promise<AssetGroup>> = [];
        preloads.push(this.context.assetManager.loadGltf('chessboard', `${this.baseUrl}/Chessboard_Main.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_bishop', `${this.baseUrl}/ChessPieces_Bishop_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_king', `${this.baseUrl}/ChessPieces_King_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_knight', `${this.baseUrl}/ChessPieces_Knight_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_pawn', `${this.baseUrl}/ChessPieces_Pawn_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_queen', `${this.baseUrl}/ChessPieces_Queen_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('white_rook', `${this.baseUrl}/ChessPieces_Rook_White.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_bishop', `${this.baseUrl}/ChessPieces_Bishop_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_king', `${this.baseUrl}/ChessPieces_King_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_knight', `${this.baseUrl}/ChessPieces_Knight_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_pawn', `${this.baseUrl}/ChessPieces_Pawn_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_queen', `${this.baseUrl}/ChessPieces_Queen_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('black_rook', `${this.baseUrl}/ChessPieces_Rook_Black.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('move_marker', `${this.baseUrl}/UI_Glow_Blue.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('check_marker', `${this.baseUrl}/UI_Glow_Blue.gltf`, 'mesh').then(value => this.assetGroups[value.name] = value));
        preloads.push(this.context.assetManager.loadGltf('selected_marker', `${this.baseUrl}/UI_Glow_Orange.gltf`).then(value => this.assetGroups[value.name] = value));
        await Promise.all(preloads);
    }

    private createRootObject() {
        // Create a root actor everything gets parented to. Offset from origin so the chess board
        // is centered on it.
        const sceneRootLoad = Actor.CreateEmpty(
            this.context, {
                actor: {
                    transform: {
                        scale: appScale
                    }
                }
            });
        this.sceneRoot = sceneRootLoad.value;
        return sceneRootLoad;
    }

    private createChessboard() {
        const loads: Array<ForwardPromise<Actor>> = [];
        const chessboardLoad = Actor.CreateFromPrefab(this.context, {
            prefabId: this.assetGroups['chessboard'].prefabs.byIndex(0).id,
            actor: {
                name: "chessboard",
                parentId: this.sceneRoot.id,
            }
        });
        loads.push(chessboardLoad);
        this.chessboard = chessboardLoad.value;

        const boardOffsetLoad = Actor.CreateEmpty(this.context, {
            actor: {
                name: "board-offset",
                parentId: this.sceneRoot.id,
                transform: {
                    position: { x: 0.135, z: 0.135 }
                }
            }
        });
        loads.push(boardOffsetLoad);
        this.boardOffset = boardOffsetLoad.value;

        const status = this.game.getStatus() as Status;
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            for (const rank of [1, 2, 3, 4, 5, 6, 7, 8]) {
                const position = this.coordinate({ file, rank });
                const loadActor = Actor.CreateEmpty(this.context, {
                    actor: {
                        name: `square-${file}${rank}`,
                        parentId: this.boardOffset.id,
                        transform: {
                            position
                        }
                    }
                });
                loads.push(loadActor);

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
                const side = modelConfigs[square.piece.side.name];
                const info = side[square.piece.type];
                const name = `${square.piece.side.name}-${square.piece.type}`;
                const position = new Vector3();
                position.copy(this.coordinate(square));
                const baseLoad = Actor.CreateEmpty(this.context, {
                    actor: {
                        name,
                        parentId: this.boardOffset.id,
                        transform: {
                            position
                        }
                    }
                });
                loads.push(baseLoad);
                const baseActor = baseLoad.value;
                const prefab = this.assetGroups[`${square.piece.side.name}_${square.piece.type}`].prefabs.byIndex(0);
                const loadActor = Actor.CreateFromPrefab(this.context, {
                    prefabId: prefab.id,
                    actor: {
                        name: `${name}-model`,
                        parentId: baseLoad.value.id,
                        transform: {
                            rotation: info.rotation
                        }
                    },
                    subscriptions: ['transform']
                });
                square.piece.actor = baseActor;
                loads.push(loadActor);
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
                    parentId: this.boardOffset.id,
                    transform: {
                        position
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
                parentId: this.boardOffset.id,
                transform: {
                    position: { x: 1, y: 999, z: 1 }
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
                parentId: this.boardOffset.id,
                transform: {
                    position: { x: 0, y: 999, z: 0 }
                }
            }
        });
        this.selectedMarker = loadActor.value;
        return loadActor;
    }

    private createJoinButtons() {

    }

    private addEventHandlers() {
        const status = this.game.getStatus() as Status;
        // Add event handlers to actors.
        for (const square of status.board.squares) {
            // Add event handlers to square.
            {
                const behavior = square.marker.setBehavior(ButtonBehavior);
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
            actor.animateTo({ transform: { scale: hoverScale } }, 0.1, hoverCurve);
        }
        this.showMoveMarkers(actor);
    }

    private stopHoverPiece(userId: string, actor: Actor) {
        if (this.selectedActor !== actor) {
            actor.animateTo({ transform: { scale: unitScale } }, 0.1, hoverCurve);
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
            this.selectedActor.animateTo({ transform: { scale: unitScale } }, 0.1, hoverCurve);
        }
        // Set the new selected actor.
        this.selectedActor = actor;
        actor.animateTo({ transform: { scale: hoverScale } }, 0.1, hoverCurve);
        this.showSelectedMarker();
        this.showMoveMarkers(actor);
    }

    private deselectPiece() {
        this.selectedActor.setAnimationState('hover', { time: 0, enabled: false });
        this.selectedActor.animateTo({ transform: { scale: unitScale } }, 0.1, hoverCurve);
        this.hideSelectedMarker();
        this.hideMoveMarkers();
        this.selectedActor = null;
    }

    private showSelectedMarker() {
        this.hideSelectedMarker();
        if (this.selectedActor) {
            const square = this.squareForActor(this.selectedActor);
            const coord = this.coordinate(square);
            this.selectedMarker.transform.position.copy(coord);
        }
    }

    private showValidMoves(moveSets: ValidMove[]) {
        for (const moveSet of moveSets || []) {
            if (moveSet) {
                for (const square of moveSet.squares) {
                    const marker = square.marker;
                    marker.transform.position.y = baseHeight;
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

    private coordinate(coord: Coordinate): Vector3Like {
        // Given a file and rank, return the coordinates of the center of the corresponding square.
        const fileIndices: { [id: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
        const file = fileIndices[coord.file];
        const rank = coord.rank - 1;
        const x = file * -boardStep;
        const z = rank * -boardStep;
        return { x, y: baseHeight, z };
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
        const moveSpeed = 3;
        const position = new Vector3();
        position.copy(this.coordinate(dst));
        position.y = actor.transform.position.y;
        const diff = position.subtract(actor.transform.position);
        const length = diff.length();
        actor.animateTo({ transform: { position } }, moveSpeed * length, AnimationEaseCurves.EaseInOutSine);
        actor.animateTo({ transform: { scale: unitScale } }, 0.1, hoverCurve);
        // Animate a slight tilt in the direction of movement.
        // const square = this.squareForActor(actor);
        // const config = modelConfigs[square.piece.side.name][square.piece.type];
        // const direction = toCoord.subtract(actor.transform.position);
        // const left = Vector3.Cross(direction, Vector3.Up());
        // const rotation = Quaternion.RotationAxis(left, -Math.PI / 8).multiply(config.rotation);
        // actor.animateTo({ transform: { rotation } }, 0.25, hoverCurve)
        //     .then(() => { actor.animateTo({ transform: { rotation: config.rotation } }, 0.25, AnimationEaseCurves.EaseInSine); });
    }

    private async animateCapture(actor: Actor) {
        actor.animateTo({ transform: { scale: { y: 0 } } }, 1.0, AnimationEaseCurves.EaseInSine);
        await delay(1000);
        actor.destroy();
    }
}

function delay(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), milliseconds);
    });
}
