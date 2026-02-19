/*
    Bottom Dash Panel - GNOME Shell 46+ extension
    Copyright @fthx 2026 - License GPL v3
*/


import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Dash from 'resource:///org/gnome/shell/ui/dash.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


const BottomEdge = GObject.registerClass(
    class BottomEdge extends Clutter.Actor {
        _init(settings, monitor) {
            super._init();

            this._settings = settings;
            this._monitor = monitor;

            this._initPressureBarrier();
            this._setBarrier();
        }

        _initPressureBarrier() {
            const EDGE_PRESSURE_TIMEOUT = 1000; // ms

            this._pressureBarrier = new Layout.PressureBarrier(
                this._settings?.get_int('bottom-pressure') ?? 150,
                EDGE_PRESSURE_TIMEOUT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);
        }

        _setBarrier() {
            if (!this._monitor)
                return;

            if (this._barrier)
                this._removeBarrier();

            this._barrierTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                const monitors = Main.layoutManager.monitors;
                const { width: width, height: height, x, y } = this._monitor;

                let monitorHasBottom = true;

                for (const otherMonitor of monitors) {
                    if (!otherMonitor || otherMonitor === this._monitor)
                        continue;

                    if (otherMonitor.y >= y + height
                        && otherMonitor.x < x + width
                        && otherMonitor.x + otherMonitor.width > x)
                        monitorHasBottom = false;
                }

                if (monitorHasBottom) {
                    this._barrier = new Meta.Barrier({
                        backend: global.backend,
                        x1: x,
                        y1: y + height,
                        x2: x + width,
                        y2: y + height,
                        directions: Meta.BarrierDirection.NEGATIVE_Y
                    });

                    this._pressureBarrier.addBarrier(this._barrier);
                }

                this._barrierTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _removeBarrier() {
            if (this._barrierTimeout) {
                GLib.Source.remove(this._barrierTimeout);
                this._barrierTimeout = null;
            }

            if (this._barrier) {
                this._pressureBarrier?.removeBarrier(this._barrier);
                this._barrier.destroy();
                this._barrier = null;
            }
        }

        destroy() {
            this._removeBarrier();

            this._pressureBarrier.destroy();
            this._pressureBarrier = null;

            super.destroy();
        }
    });

const BottomDash = GObject.registerClass(
    class BottomDash extends Dash.Dash {
        _init(settings, monitor) {
            super._init();

            this._settings = settings;
            this._monitor = monitor;

            this._dashHeightRatio = this._settings?.get_double('dash-height') ?? 4.4;
            this._animationTime = this._settings?.get_int('animation-time') ?? 200;
            this._autoHide = this._settings?.get_boolean('auto-hide');
            this._panelMode = this._settings?.get_boolean('panel-mode');

            this.reactive = true;
            this.track_hover = true;
            this._background.reactive = true;

            if (this._settings?.get_boolean('accent-color'))
                this._background.set_style('background-color: st-mix(-st-accent-color, black, 30%);');
            else
                this._background.set_style(`background-color: ${this._settings?.get_string('background-color')};`);
            if (this._settings?.get_boolean('sync-color'))
                Main.panel.set_style(this._background.get_style());

            if (this._settings?.get_boolean('panel-mode'))
                this._background.add_style_class_name('bottom-dash-panel-panel-mode');
            else
                this._background.add_style_class_name('bottom-dash-panel-dock-mode');

            this.set_pivot_point(0.5, 1.0);
            this._background.set_pivot_point(0.5, 1.0);

            if (this._settings?.get_boolean('overlap-windows'))
                Main.layoutManager.addTopChrome(this);
            else
                Main.layoutManager.addTopChrome(this, {
                    affectsInputRegion: true, affectsStruts: true, trackFullscreen: true,
                });

            if (this._settings?.get_boolean('toggle-panel'))
                this._setBottomEdge();
            this._setGeometry();

            this.connectObject(
                'notify::width', () => this._setGeometry(),
                'notify::hover', () => this._onHover(),
                'scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event),
                this);
            this.showAppsButton.connectObject('notify::checked', () => this._onShowAppsButtonClicked(), this);

            if (this._autoHide)
                Main.overview.connectObject(
                    'showing', () => this._show(),
                    'hiding', () => this._hide(),
                    this);
        }

        _setBottomEdge() {
            this._setBottomEdgeTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (this._monitor) {
                    this._bottomEdge = new BottomEdge(this._settings, this._monitor);
                    this._bottomEdge._pressureBarrier?.connectObject('trigger', () => this._toggle(), this);
                }

                this._setBottomEdgeTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _setGeometry() {
            if (Main.overview.visible)
                return;

            if (this._setGeometryTimeout)
                GLib.Source.remove(this._setGeometryTimeout);

            this._setGeometryTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (this._monitor) {
                    const { width: width, height: height, x, y } = this._monitor;
                    const dashHeight = Math.round(this._dashHeightRatio / 100 * height);

                    if (this._panelMode) {
                        this._background.width = width;
                        this.set_position(x, y + height - this.height);
                    } else
                        this.set_position(x + Math.round((width - this.width) / 2), y + height - this.height);
                    this.setMaxSize(width, dashHeight);
                }

                this._setGeometryTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _show() {
            this.remove_all_transitions();

            this.show();
            this.ease({
                duration: this._animationTime,
                scale_y: 1,
                opacity: 255,
                mode: Clutter.AnimationMode.EASE_IN_QUAD,
            });
        }

        _hide() {
            this.remove_all_transitions();

            this.ease({
                duration: this._animationTime,
                scale_y: 0,
                opacity: 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    this.hide();
                },
            });
        }

        _toggle() {
            if (this.visible && !(Main.overview.visible && this._autoHide))
                this._hide();
            else
                this._show();
        }

        _onShowAppsButtonClicked() {
            if (Main.overview.visible)
                Main.overview._overview._controls._toggleAppsPage();
            else
                Main.overview.showApps();
        }

        _onHover() {
            if (this._autoHide && !this.get_hover() && !this._keepDashShown && !Main.overview.visible)
                this._hide();
        }

        _itemMenuStateChanged(item, opened) {
            if (opened) {
                if (this._showLabelTimeoutId > 0) {
                    GLib.source_remove(this._showLabelTimeoutId);
                    this._showLabelTimeoutId = 0;
                }

                item.hideLabel();

                this._keepDashShown = true;
            } else
                this._keepDashShown = false;

            this._onHover();
        }

        _queueRedisplay() {
            if (this._workId)
                Main.queueDeferredWork(this._workId);
        }

        destroy() {
            if (this._setBottomEdgeTimeout) {
                GLib.Source.remove(this._setBottomEdgeTimeout);
                this._setBottomEdgeTimeout = null;
            }

            if (this._setGeometryTimeout) {
                GLib.Source.remove(this._setGeometryTimeout);
                this._setGeometryTimeout = null;
            }

            this._bottomEdge?._pressureBarrier?.disconnectObject(this);
            this._bottomEdge?.destroy();

            this.showAppsButton.disconnectObject(this);
            if (this._autoHide)
                Main.overview.disconnectObject(this);

            if (this.get_parent() === Main.layoutManager.uiGroup)
                Main.layoutManager.removeChrome(this);

            Main.panel.set_style(null);

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
                this._hideTopPanel();

            if (this._settings?.get_boolean('overlap-windows') && this._settings?.get_boolean('hide-top-panel'))
                this._disableUnredirect();

            this._refresh();
            Main.layoutManager.connectObject('monitors-changed', () => this._refresh(), this);
        }

        _disableUnredirect() {
            if (typeof global.compositor?.disable_unredirect === 'function')
                global.compositor.disable_unredirect();
            else
                Meta.disable_unredirect_for_display(global.display);
        }

        _enableUnredirect() {
            if (typeof global.compositor?.enable_unredirect === 'function')
                global.compositor.enable_unredirect();
            else
                Meta.enable_unredirect_for_display(global.display);
        }

        _refresh() {
            this._clean();

            if (this._refreshTimeout)
                GLib.Source.remove(this._refreshTimeout);

            this._refreshTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._dashList = [];

                const monitors = Main.layoutManager.monitors;
                if (this._settings?.get_boolean('multi-monitor'))
                    monitors?.forEach(monitor => this._initDash(monitor));
                else
                    this._initDash(Main.layoutManager.primaryMonitor);

                this._refreshTimeout = null;
                return GLib.SOURCE_REMOVE;
            });

        }

        _clean() {
            if (this._dashList) {
                this._dashList.forEach(dash => dash?.destroy());
                this._dashList = null;
            }
        }

        _initDash(monitor) {
            if (!monitor)
                return;

            const dash = new BottomDash(this._settings, monitor);
            this._dashList.push(dash);
        }

        _showTopPanel() {
            if (Main.layoutManager.overviewGroup.get_children().includes(Main.layoutManager.panelBox))
                Main.layoutManager.overviewGroup.remove_child(Main.layoutManager.panelBox);
            if (Main.layoutManager.panelBox.get_parent() !== Main.layoutManager.uiGroup)
                Main.layoutManager.addChrome(Main.layoutManager.panelBox, { affectsStruts: true, trackFullscreen: false });

            Main.overview.searchEntry.get_parent()?.set_style('margin-top: 0px;');
        }

        _hideTopPanel() {
            if (Main.layoutManager.panelBox.get_parent() === Main.layoutManager.uiGroup)
                Main.layoutManager.removeChrome(Main.layoutManager.panelBox);
            if (!Main.layoutManager.overviewGroup.get_children().includes(Main.layoutManager.panelBox))
                Main.layoutManager.overviewGroup.insert_child_at_index(Main.layoutManager.panelBox, 0);

            Main.overview.searchEntry.get_parent()?.set_style('margin-top: 32px;');
        }

        destroy() {
            Main.layoutManager.disconnectObject(this);

            if (this._refreshTimeout) {
                GLib.Source.remove(this._refreshTimeout);
                this._refreshTimeout = null;
            }

            this._clean();

            this._enableUnredirect();
            this._showTopPanel();
        }
    });

export default class BottomDashPanelExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    _initBottomDashPanel() {
        if (this._settings?.get_boolean('no-overview'))
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
