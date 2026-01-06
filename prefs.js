import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class BottomDashPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Bottom Dash Panel extension',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);


        const group1 = new Adw.PreferencesGroup();
        page.add(group1);

        const multiMonitor = new Adw.SwitchRow({
            title: 'Bottom panel on all monitors',
        });
        group1.add(multiMonitor);
        window._settings.bind('multi-monitor', multiMonitor, 'active', Gio.SettingsBindFlags.DEFAULT);

        const togglePanel = new Adw.SwitchRow({
            title: 'Bottom pressure to toggle bottom panel',
            subtitle: 'Dock mode or simply bottom panel toggle.',
        });
        group1.add(togglePanel);
        window._settings.bind('toggle-panel', togglePanel, 'active', Gio.SettingsBindFlags.DEFAULT);

        const overlapWindows = new Adw.SwitchRow({
            title: 'Bottom panel overlaps windows',
            subtitle: 'Classical dock behaviour.',
        });
        group1.add(overlapWindows);
        window._settings.bind('overlap-windows', overlapWindows, 'active', Gio.SettingsBindFlags.DEFAULT);

        const autoHide = new Adw.SwitchRow({
            title: 'Auto hide bottom panel',
            subtitle: 'There is no intellihide here.',
        });
        group1.add(autoHide);
        window._settings.bind('auto-hide', autoHide, 'active', Gio.SettingsBindFlags.DEFAULT);

        const hideTopPanel = new Adw.SwitchRow({
            title: 'Hide top panel',
            subtitle: 'Top panel appears only in overview.',
        });
        group1.add(hideTopPanel);
        window._settings.bind('hide-top-panel', hideTopPanel, 'active', Gio.SettingsBindFlags.DEFAULT);

        const noOverview = new Adw.SwitchRow({
            title: 'No overview at start-up',
        });
        group1.add(noOverview);
        window._settings.bind('no-overview', noOverview, 'active', Gio.SettingsBindFlags.DEFAULT);


        const group2 = new Adw.PreferencesGroup();
        page.add(group2);

        const adjustmentDashHeight = new Gtk.Adjustment({
            lower: 1,
            upper: 15,
            step_increment: 0.1,
            page_increment: 1.0,
        });

        const dashHeight = new Adw.SpinRow({
            title: 'Dash max height (% of monitor height)',
            subtitle: 'GNOME dash has fixed icon sizes (16, 22, 24, 32, 48, 64).\nActual dash height can be less than this maximum.',
            adjustment: adjustmentDashHeight,
            digits: 1,
        });
        group2.add(dashHeight);
        window._settings.bind('dash-height', dashHeight, 'value', Gio.SettingsBindFlags.DEFAULT);

        const adjustmentDashBackgroundOpacity = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 5,
        });

        const dashBackgroundOpacity = new Adw.SpinRow({
            title: 'Dash background opacity (%)',
            subtitle: '100% is GNOME dash natural opacity (opaque).',
            adjustment: adjustmentDashBackgroundOpacity,
        });
        group2.add(dashBackgroundOpacity);
        window._settings.bind('dash-background-opacity', dashBackgroundOpacity, 'value', Gio.SettingsBindFlags.DEFAULT);

        const adjustmentAnimationTime = new Gtk.Adjustment({
            lower: 0,
            upper: 500,
            step_increment: 50,
        });

        const animationTime = new Adw.SpinRow({
            title: 'Dash hide/show animation time (ms)',
            adjustment: adjustmentAnimationTime,
        });
        group2.add(animationTime);
        window._settings.bind('animation-time', animationTime, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
