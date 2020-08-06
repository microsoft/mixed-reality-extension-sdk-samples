/*!
 * Copyright (c) Ben Garfield. All rights reserved.
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 */
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import GroupMaskSample from './app';

export enum ButtonMask {
	DEFAULT_A = 0,
	DEFAULT_B,
	DEFAULT_C,
	DEFAULT_D,
	HOVER_A,
	HOVER_B,
	HOVER_C,
	HOVER_D,
	CLICK_A,
	CLICK_B,
	CLICK_C,
	CLICK_D,
	MAX
}

export enum OtherMask {
	CUSTOM_1 = ButtonMask.MAX,
	MAX
}

export enum JoinMask {
	DEFAULT = ButtonMask.DEFAULT_A,
	HOVER = ButtonMask.HOVER_A,
	CLICK = ButtonMask.CLICK_A,
	LEAVE = ButtonMask.DEFAULT_B,
	LEAVE_HOVER = ButtonMask.HOVER_B
}

export default class GroupMaskManager {
	private masks: MRE.GroupMask[];
	private readonly PREFIX = 'MASK_';

	public constructor(app: GroupMaskSample) {
		this.masks = [];
		for (let i = 0; i < OtherMask.MAX; i++) {
			const mask = new MRE.GroupMask(app.context, ['MASK_' + i]);
			this.masks.push(mask);
		}
	}

	public getButtonMask(i: ButtonMask | JoinMask): MRE.GroupMask {
		return this.masks[i];
	}

	public getButtonMaskTag(i: ButtonMask | JoinMask): string {
		return this.PREFIX + i.toString();
	}

	public get joinGroup(): string {
		return this.getButtonMaskTag(JoinMask.LEAVE);
	}
}
