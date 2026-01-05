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
        _init(settings, monitor) {
            super._init();

            this._settings = settings;
            this._monitor = monitor;

            this._dashBackgroundOpacityRatio = this._settings?.get_int('dash-background-opacity') ?? 100;
            this._dashHeightRatio = this._settings?.get_double('dash-height') ?? 4.4;

            this.reactive = true;
            this._background.reactive = true;
            this._background.opacity = (this._dashBackgroundOpacityRatio) / 100 * 255;

            this.set_pivot_point(0.5, 1.0);
            this._background.set_pivot_point(0.5, 1.0);

            Main.layoutManager.addTopChrome(this, {
                affectsInputRegion: true, affectsStruts: true, trackFullscreen: true,
            });

            this._setGeometry();

            this.connectObject(
                'scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event),
                'icon-size-changed', () => this._setGeometry(),
                this);
            this.showAppsButton.connectObject('notify::checked', () => this._onShowAppsButtonClicked(), this);
        }

        _setGeometry() {
            if (Main.overview.visible)
                return;

            this._setGeometryTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (this._monitor) {
                    const { width: width, height: height, x, y } = this._monitor;
                    const dashHeight = Math.round(this._dashHeightRatio / 100 * height);
                    this._background.width = width;
                    this.set_position(x, y + height - this.height);
                    this.setMaxSize(width, dashHeight);
                }

                this._setGeometryTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _onShowAppsButtonClicked() {
            if (Main.overview.visible)
                Main.overview._overview._controls._toggleAppsPage();
            else
                Main.overview.showApps();
        }

        _queueRedisplay() {
            if (this._workId)
                Main.queueDeferredWork(this._workId);
        }

        destroy() {
            if (this._setGeometryTimeout) {
                GLib.Source.remove(this._setGeometryTimeout);
                this._setGeometryTimeout = null;
            }

            this.showAppsButton.disconnectObject(this);

            if (this.get_parent() === Main.layoutManager.uiGroup)
                Main.layoutManager.removeChrome(this);

            this._workId = null;

            super.destroy();
        }
    });

const BottomDashPanel = GObject.registerClass(
    class BottomDashPanel extends GObject.Object {
        _init(settings) {
            super._init();

            this._settings = settings;

            if (this._settings?.get_boolean('hide-top-panel'))
                this._hidePanel();

            this._dashList = [];
            this._dashTimeoutList = [];
            const monitors = Main.layoutManager.monitors;
            if (this._settings?.get_boolean('multi-monitor'))
                monitors?.forEach(monitor => this._initDash(monitor));
            else
                this._initDash(Main.layoutManager.primaryMonitor);
        }

        _initDash(monitor) {
            if (!monitor)
                return;

            const dash = new BottomDash(this._settings, monitor);
            this._dashList.push(dash);
        }

        _showPanel() {
            if (Main.layoutManager.overviewGroup.get_children().includes(Main.layoutManager.panelBox))
                Main.layoutManager.overviewGroup.remove_child(Main.layoutManager.panelBox);
            if (Main.layoutManager.panelBox.get_parent() !== Main.layoutManager.uiGroup)
                Main.layoutManager.addChrome(Main.layoutManager.panelBox, { affectsStruts: true, trackFullscreen: false });

            Main.overview.searchEntry.get_parent().set_style('margin-top: 0px;');
        }

        _hidePanel() {
            if (Main.layoutManager.panelBox.get_parent() === Main.layoutManager.uiGroup)
                Main.layoutManager.removeChrome(Main.layoutManager.panelBox);
            if (!Main.layoutManager.overviewGroup.get_children().includes(Main.layoutManager.panelBox))
                Main.layoutManager.overviewGroup.insert_child_at_index(Main.layoutManager.panelBox, 0);

            Main.overview.searchEntry.get_parent().set_style('margin-top: 32px;');
        }

        destroy() {
            this._dashList.forEach(dash => {
                dash?.destroy();
                dash = null;
            });
            this._dashList = null;

            if (this._settings?.get_boolean('hide-top-panel'))
                this._showPanel();
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
