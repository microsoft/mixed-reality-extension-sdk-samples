/*!
 * Copyright (c) Ben Garfield. All rights reserved.
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 */
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import GroupMaskSample from './app';

/** An enumeration of the different states a user can be in for particular controls. */
export enum ButtonMask {
	/** The user isn't hovering over A */
	DEFAULT_A = 0,
	/** The user isn't hovering over B */
	DEFAULT_B,
	/** The user isn't hovering over C */
	DEFAULT_C,
	/** The user isn't hovering over D */
	DEFAULT_D,
	/** The user is hovering over A */
	HOVER_A,
	/** The user is hovering over B */
	HOVER_B,
	/** The user is hovering over C */
	HOVER_C,
	/** The user is hovering over D */
	HOVER_D,
	/** The user is clicking on A */
	CLICK_A,
	/** The user is clicking on B */
	CLICK_B,
	/** The user is clicking on C */
	CLICK_C,
	/** The user is clicking on D */
	CLICK_D,
	/** The last value, used for looping over this enum */
	MAX
}

/** Reuses group masks for multiple objects, so a user can be added to a group and get a whole set of objects. */
export class GroupMaskManager {
	private static readonly PREFIX = 'MASK_';

	/** Keep a list of the group masks so we can reuse them. */
	private masks: MRE.GroupMask[];

	public constructor(app: GroupMaskSample) {
		// construct the various masks we'll need in advance
		this.masks = [];
		for (let i = 0; i < ButtonMask.MAX; i++) {
			const mask = new MRE.GroupMask(app.context, [this.getButtonMaskTag(i)]);
			this.masks.push(mask);
		}
	}

	/** Fetch the mask for a particular user action */
	public getButtonMask(i: ButtonMask): MRE.GroupMask {
		return this.masks[i];
	}

	/** Fetch the ID of the mask for a particular user action */
	public getButtonMaskTag(i: ButtonMask): string {
		return GroupMaskManager.PREFIX + i.toString();
	}
}
