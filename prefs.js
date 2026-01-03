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

        const adjustmentDashScaleFactor = new Gtk.Adjustment({
            lower: 10,
            upper: 100,
            step_increment: 5,
        });

        const dashScaleFactor = new Adw.SpinRow({
            title: 'Dash scale factor (%)',
            subtitle: '100% is the dash natural height in overview.',
            adjustment: adjustmentDashScaleFactor,
        });
        group.add(dashScaleFactor);
        window._settings.bind('dash-scale-factor', dashScaleFactor, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
