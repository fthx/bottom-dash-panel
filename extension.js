/*
    Bottom Dash Panel - GNOME Shell 46+ extension
    Copyright @fthx 2026 - License GPL v3
*/


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Dash from 'resource:///org/gnome/shell/ui/dash.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


const BottomDash = GObject.registerClass(
    class BottomDash extends Dash.Dash {
        _init() {
            super._init();
        }

        _queueRedisplay() {
            if (this._workId)
                Main.queueDeferredWork(this._workId);
        }

        destroy() {
            this._workId = null;

            super.destroy();
        }
    });

const BottomDashPanel = GObject.registerClass(
    class BottomDashPanel extends GObject.Object {
        _init(settings) {
            super._init();

            this._settings = settings;
            this._dashBackgroundOpacityRatio = this._settings?.get_int('dash-background-opacity') ?? 100;
            this._dashHeightRatio = this._settings?.get_double('dash-height') ?? 4.4;

            this._dashList = [];
            this._dashTimeoutList = [];
            const monitors = Main.layoutManager.monitors;
            monitors?.forEach(monitor => this._initDash(monitor));
            //this._initDash(Main.layoutManager.primaryMonitor);
        }

        _initDash(monitor) {
            const dash = new BottomDash();
            this._dashList.push(dash);

            dash.reactive = true;
            dash._background.reactive = true;
            dash._background.opacity = (this._dashBackgroundOpacityRatio) / 100 * 255;

            dash.set_pivot_point(0.5, 1.0);
            dash._background.set_pivot_point(0.5, 1.0);

            Main.layoutManager.addTopChrome(dash, {
                affectsInputRegion: true, affectsStruts: true, trackFullscreen: true,
            });

            dash.connectObject(
                'icon-size-changed', () => this._setDash(monitor, dash),
                'scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event),
                this);
            dash.showAppsButton.connectObject('notify::checked', () => this._onShowAppsButtonClicked(), this);

            this._setDash(monitor, dash);
        }

        _setDash(monitor, dash) {
            if (Main.overview.visible)
                return;

            let dashTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (monitor) {
                    const { width: width, height: height, x, y } = monitor;
                    const dashHeight = Math.round(this._dashHeightRatio / 100 * height);
                    dash._background.width = width;
                    dash.set_position(x, y + height - dash.height);
                    dash.setMaxSize(width, dashHeight);
                }

                return GLib.SOURCE_REMOVE;
            });
            this._dashTimeoutList.push(dashTimeout);
        }

        _onShowAppsButtonClicked() {
            if (Main.overview.visible)
                Main.overview._overview._controls._toggleAppsPage();
            else
                Main.overview.showApps();
        }

        destroy() {
            this._dashTimeoutList.forEach(dashTimeout => {
                if (dashTimeout) {
                    GLib.Source.remove(dashTimeout);
                    dashTimeout = null;
                }
            });
            this._dashTimeoutList = null;

            this._dashList.forEach(dash => {
                if (dash) {
                    dash.showAppsButton.disconnectObject(this);
                    dash.disconnectObject(this);

                    if (dash.get_parent() === Main.layoutManager.uiGroup)
                        Main.layoutManager.removeChrome(dash);

                    dash.destroy();
                    dash = null;
                }
            });
            this._dashList = null;
        }
    });

export default class BottomDashPanelExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    _initBottomDashPanel() {
        Main.overview.hide();
        Main.overview.dash.hide();

        Main.layoutManager.uiGroup.add_style_class_name('bottom-dash-panel');

        if (this._initTimeout)
            return;

        this._initTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._bottomDashPanel = new BottomDashPanel(this._settings);

            this._initTimeout = null;
            return GLib.SOURCE_REMOVE;
        });

        Main.layoutManager.connectObject('monitors-changed', () => this._restart(), this);
    }

    _restart() {
        this.disable();
        this.enable();
    }

    enable() {
        this._settings = this.getSettings();
        this._settings?.connectObject('changed', () => this._restart(), this);

        if (Main.layoutManager._startingUp)
            Main.layoutManager.connectObject('startup-complete', () => this._initBottomDashPanel(), this);
        else
            this._initBottomDashPanel();
    }

    disable() {
        if (this._initTimeout) {
            GLib.Source.remove(this._initTimeout);
            this._initTimeout = null;
        }

        Main.layoutManager.disconnectObject(this);

        this._bottomDashPanel?.destroy();
        this._bottomDashPanel = null;
        Main.layoutManager.uiGroup.remove_style_class_name('bottom-dash-panel');

        Main.overview.dash.show();

        this._settings?.disconnectObject(this);
        this._settings = null;
    }
}
