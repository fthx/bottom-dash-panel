/*
    Bottom Dash Panel - GNOME Shell 46+ extension
    Copyright @fthx 2026 - License GPL v3
*/


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Dash from 'resource:///org/gnome/shell/ui/dash.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


const BottomDashPanel = GObject.registerClass(
    class BottomDashPanel extends GObject.Object {
        _init(settings) {
            super._init();

            this._settings = settings;

            this._initDash();
        }

        _initDash() {
            this._dash = new Dash.Dash();

            this._dash.reactive = true;
            this._dash._background.reactive = true;

            this._dash._background.opacity = (this._settings?.get_int('dash-background-opacity') ?? 100) / 100 * 255;

            this._dash.set_pivot_point(0.5, 1.0);
            this._dash._background.set_pivot_point(0.5, 1.0);

            Main.overview.dash.hide();
            Main.layoutManager.addTopChrome(this._dash, {
                affectsInputRegion: true, affectsStruts: true, trackFullscreen: true,
            });

            Main.layoutManager.uiGroup.add_style_class_name('bottom-dash-panel');

            this._dash.connectObject(
                'icon-size-changed', () => this._setDash(),
                'scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event),
                this);
            this._dash.showAppsButton.connectObject('notify::checked', () => this._onShowAppsButtonClicked(), this);

            this._setDash();
        }

        _onShowAppsButtonClicked() {
            if (Main.overview.visible)
                Main.overview._overview._controls._onShowAppsButtonToggled();
            else
                Main.overview.showApps();
        }

        _setDash() {
            if (this._dashTimeout || Main.overview.visible)
                return;

            this._dashTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                const monitor = Main.layoutManager.primaryMonitor;
                if (monitor) {
                    const { width: width, height: height, x, y } = monitor;
                    this._dash._background.width = width;
                    this._dash.set_position(x, y + height - this._dash.height);
                    this._dash.setMaxSize(width, 42);
                }

                this._dashTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        destroy() {
            if (this._dashTimeout) {
                GLib.Source.remove(this._dashTimeout);
                this._dashTimeout = null;
            }

            this._dash.disconnectObject(this);
            this._dash.showAppsButton.disconnectObject(this);

            this._dash.reactive = false;
            this._dash._background.reactive = false;
            this._dash._background.opacity = 255;
            this._dash.set_pivot_point(0.0, 0.0);
            this._dash._background.set_pivot_point(0.0, 0.0);
            this._dash._background.width = -1;
            this._dash.set_size(-1, -1);
            this._dash.set_position(-1, -1);
            this._dash.setMaxSize(-1, -1);

            if (this._dash.get_parent() === Main.layoutManager.uiGroup)
                Main.layoutManager.removeChrome(this._dash);

            Main.layoutManager.uiGroup.remove_style_class_name('bottom-dash-panel');

            ////////////////////////////////////Main.overview.show();
        }
    });

export default class BottomDashPanelExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    _initBottomDashPanel() {
        Main.overview.hide();

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

        this._settings?.disconnectObject(this);
        this._settings = null;
    }
}
