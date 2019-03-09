/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Actor,
    Context,
    ParameterSet,
    Vector3
} from '@microsoft/mixed-reality-extension-sdk';

import {
    VideoPlayerManager
} from '@microsoft/mixed-reality-extension-altspacevr-extras';
import { promises } from 'fs';

/**
 * The main class of this app. All the logic goes here.
 */
export default class AltspaceVRMoviePlayer {

    private videoPlayerManager: VideoPlayerManager;

    constructor(private context: Context, private params: ParameterSet, private baseUrl: string) {
        this.context.onStarted(() => this.started());
        this.videoPlayerManager = new VideoPlayerManager(context);
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise<void>((resolve) => {
            setTimeout(() => resolve(), milliseconds);
        });
    }

    /**
     * Once the context is "started", initialize the app.
     */
    private async started() {
        const videoActorPromise1 = Actor.CreateEmpty(this.context, {});
        const videoActorPromise2 = Actor.CreateEmpty(this.context, {});
        await videoActorPromise1;
        await videoActorPromise2;

        const startTime: number = +this.params.startTime as number || +this.params.starttime as number|| 0;
        const loopTime: number  = +this.params.loopTime as number || +this.params.looptime as number|| 0;
        const youtubeID: string  = this.params.youtubeID as string || this.params.youtubeid as string || 'BQsi9gXKQGw';

        const url = `https://www.youtube.com/watch?v=` + youtubeID;
        while (true) {
            this.videoPlayerManager.play(
                videoActorPromise1.value.id,
                url,
                startTime);
            this.videoPlayerManager.stop(videoActorPromise2.value.id);
            if (loopTime <= 0) {
                break;
            }
            await this.delay(loopTime * 1000);

            this.videoPlayerManager.play(
                videoActorPromise2.value.id,
                url,
                startTime);
            this.videoPlayerManager.stop(videoActorPromise1.value.id);
            await this.delay(loopTime * 1000);
        }
    }

}
