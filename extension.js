/*
    Bottom Dash Panel - GNOME Shell 46+ extension
    Copyright @fthx 2026 - License GPL v3
*/


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


const BottomDashPanel = GObject.registerClass(
    class BottomDashPanel extends GObject.Object {
        _init(settings) {
            super._init();

            this._dashScale = (settings?.get_int('dash-scale-factor') ?? 100) / 100;
            this._initDash();
        }

        _initDash() {
            this._dash = Main.overview.dash;

            this._dash.add_style_class_name('bottom-dash-panel');
            this._dash.showAppsButton.add_style_class_name('bottom-dash-panel-no-padding');
            this._dash.reactive = true;
            this._dash._background.reactive = true;
            this._dash.set_pivot_point(0.5, 1.0);
            this._dash._background.set_pivot_point(0.5, 1.0);

            this._dash.connectObject('scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event), this);
            this._dash.showAppsButton.connectObject('notify::checked', () => this._onShowAppsButtonClicked(), this);

            if (Main.overview._overview._controls.get_children().includes(this._dash)) {
                Main.overview._overview._controls.remove_child(this._dash);
                Main.layoutManager.addTopChrome(this._dash, {
                    affectsInputRegion: true, affectsStruts: true, trackFullscreen: true,
                });
            }

            this._setDash();
            this._dash._box.connectObject('child-added', (actor, item) => this._setDotStyle(item), this);
        }

        _onShowAppsButtonClicked() {
            if (!Main.overview.visible)
                Main.overview.showApps();
        }

        _setDotStyle(item) {
            if (!item?.child || !this._scaleFactor)
                return;

            item.child.add_style_class_name('bottom-dash-panel-no-padding');
            item.child._dot.width = this._dash.iconSize * 0.5;
            item.child._dot.height = this._scaleFactor * 3;
        }

        _setDash() {
            if (this._dashTimeout) {
                GLib.Source.remove(this._dashTimeout);
                this._dashTimeout = null;
            }

            this._dashTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                const monitor = Main.layoutManager.primaryMonitor;

                if (monitor) {
                    const { width: width, height: height, x, y } = monitor;
                    this._scaleFactor = global.display.get_monitor_scale(monitor);

                    this._dash.scale_x = this._dashScale;
                    this._dash.scale_y = this._dashScale;
                    this._dash._background.width = width;
                    this._dash._background.scale_x = 1 / this._dashScale;
                    this._dash.set_position(x, y + height - this._dash.height);

                    this._dash._box.get_children().forEach(item => this._setDotStyle(item));
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
            this._dash._box.disconnectObject(this);
            this._dash.showAppsButton.disconnectObject(this);

            this._dash.reactive = false;
            this._dash._background.reactive = false;
            this._dash.remove_style_class_name('bottom-dash-panel');
            this._dash.scale_x = 1;
            this._dash.scale_y = 1;
            this._dash.width = -1;
            this._dash.height = -1;
            this._dash._background.width = -1;
            this._dash._background.scale_x = 1;
            this._dash.set_position(-1, -1);
            this._dash.setMaxSize(-1, -1);
            this._dash.set_pivot_point(0.0, 0.0);
            this._dash._background.set_pivot_point(0.0, 0.0);

            this._dash.showAppsButton.remove_style_class_name('bottom-dash-panel-no-padding');
            this._dash._box.get_children().forEach(item => {
                item.child?.remove_style_class_name('bottom-dash-panel-no-padding');
                item.child?._dot.set_width(-1);
                item.child?._dot.set_height(-1);
            });

            if (this._dash.get_parent() === Main.layoutManager.uiGroup) {
                Main.layoutManager.removeChrome(this._dash);
                Main.overview._overview._controls.add_child(this._dash);
            }

            Main.overview.show();
        }
    });

export default class BottomDashPanelExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    _initBottomDashPanel() {
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
        this._settings?.disconnectObject(this);
        this._settings = null;

        if (this._initTimeout) {
            GLib.Source.remove(this._initTimeout);
            this._initTimeout = null;
        }

        Main.layoutManager.disconnectObject(this);

        this._bottomDashPanel?.destroy();
        this._bottomDashPanel = null;
    }
}
