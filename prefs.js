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

        const group = new Adw.PreferencesGroup();
        page.add(group);

        const adjustmentDashBackgroundOpacity = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 5,
        });

        const dashBackgroundOpacity = new Adw.SpinRow({
            title: 'Dash background opacity (%)',
            subtitle: '100% is the dash natural opacity (opaque).',
            adjustment: adjustmentDashBackgroundOpacity,
        });
        group.add(dashBackgroundOpacity);
        window._settings.bind('dash-background-opacity', dashBackgroundOpacity, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
