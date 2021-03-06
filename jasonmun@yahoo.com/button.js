/*
 * Auto OVPN gnome extension
 * https://jasonmun.blogspot.my
 * 
 * Copyright (C) 2017 Jason Mun
 *
 * Auto OVPN gnome extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Auto OVPN gnome extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Show Ip gnome extension.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const Main        = imports.ui.main;
const PanelMenu   = imports.ui.panelMenu;
const Mainloop    = imports.mainloop;
const Extension   = imports.misc.extensionUtils.getCurrentExtension();
const BoxLayout   = Extension.imports.boxlayout.BoxLayout;
const Convenience = Extension.imports.convenience;
const MenuItem    = Extension.imports.menuitem.MenuItem;
const Utilities   = Extension.imports.utilities;

const IP_RE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

const IP_RE_IN_STR = /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/

const CD_RE = /^([a-z][a-z])$/

const HTML_TAGS_RE = /<[^>]*>/g

// const NOT_CONNECTED = "Not Connected";
const NOT_CONNECTED = "Auto OVPN";

const DEFAULT_COUNTRY_CODE = "icon"

const DEFAULT_LOOP_SEC = 15;

const ARR_URL_IP = [];
const ARR_URL_CODE = [];

let CURRENT_IP   = null;
let GOOGLE_IP    = null;
let LST_IP       = null;
let LST_COUNTRY  = null;
let URL_IP       = null;
let URL_IP_COUNTRY   = null;
let URL_COUNTRY      = null;
let RETURN_DATA      = null;
let RET_COUNTRY_CODE = null;

let _httpSession = null;

let _Schema = null;

let LOOP_SEC = DEFAULT_LOOP_SEC;

let redraw = 0;

let temp = null;

const PanelMenuButton = new Lang.Class({
	Name: "PanelMenuButton",
	Extends: PanelMenu.Button,

	_init: function(file, updateInterval) {
		this.parent(0, "", false);
		
		// this._timeout = LOOP_SEC;
		
		//_Schema = Convenience.getSettings();
		//ARR_URL_IP.push(_Schema.get_string('ip-lookup-service').trim());
		
		ARR_URL_IP.push("http://ipinfo.io/ip");
		ARR_URL_IP.push("http://checkip.dyndns.com/");
		ARR_URL_IP.push("http://checkip.dyndns.org/");
		ARR_URL_IP.push("http://checkip.dyn.com/");
		ARR_URL_IP.push("http://icanhazip.com/");
		ARR_URL_IP.push("http://ipecho.net/plain");
		ARR_URL_IP.push("https://l2.io/ip.js?var=myip");
		ARR_URL_IP.push("https://api.ipify.org?format=jsonp&callback=getIP");
		ARR_URL_IP.push("https://api.userinfo.io/userinfos");
		
		// ARR_URL_IP.push("http://checkmyip.com/");
		
		ARR_URL_IP.push("http://www.showmyip.gr/");
		ARR_URL_IP.push("http://www.showip.com/");
		ARR_URL_IP.push("http://www.showmemyip.com/");
		ARR_URL_IP.push("http://ifconfig.co/");
		ARR_URL_IP.push("http://www.checkip.com/");
		ARR_URL_IP.push("http://www.geoplugin.com/webservices/json");
		ARR_URL_IP.push("https://www.whatismyip.net/");
		ARR_URL_IP.push("https://showip.net/");
		ARR_URL_IP.push("https://www.iplocation.net/hide-ip-with-vpn");
		
		URL_IP = ARR_URL_IP[0];
		
		ARR_URL_CODE.push("http://ipinfo.io/");
		ARR_URL_CODE.push("https://ipapi.co/");
		ARR_URL_CODE.push("https://db-ip.com/");
		ARR_URL_CODE.push("http://getcitydetails.geobytes.com/GetCityDetails?fqcn=");
		ARR_URL_CODE.push("https://www.geoip-db.com/json/");
		ARR_URL_CODE.push("http://freegeoip.net/json/");
		ARR_URL_CODE.push("http://geoip.nekudo.com/api/");
		
		URL_COUNTRY = ARR_URL_CODE[0];

		this._file = file;

		if (this._BoxLayout == null) {
			this._BoxLayout = new BoxLayout();
			this.actor.add_actor(this._BoxLayout);
			this._update();
		}
		
		this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
		/*
		let argv = ["gsettings", "set", "org.gnome.desktop.session", "idle-delay", "31536000"];
		GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
		argv = null;
		*/
		redraw = 0;

		//this._update();
		this._refresh();
	},

	_update: function() {
		try {
			Utilities.spawnWithCallback(null, [this._file.get_path()], null, 0, null, Lang.bind(this, function(standardOutput) {				
				let output = standardOutput.split("\n");
				for (let i = 0; i < output.length; i++) {
				if (output[i].trim().length > 0) {
					this.menu.addMenuItem(new MenuItem(this, Utilities.parseLine(output[i])));
				}
			}
			}));
		} catch (error) {
			log("Unable to execute file '" + this._file.get_basename() + "': " + error);
		}
	},
	
	_refresh: function () {
		this._loadData();
		this._removeTimeout();
		this._timeout = Mainloop.timeout_add_seconds(LOOP_SEC, Lang.bind(this, this._refresh));
		return true;
	},
	
	_url_add_ip: function () {
		let w = "";
		if (URL_COUNTRY.indexOf("ipinfo.io") > -1)                          { w = "http://ipinfo.io/" + CURRENT_IP + "/country";
		} else if (URL_COUNTRY.indexOf("ipapi.co") > -1)                    { w = "https://ipapi.co/" + CURRENT_IP + "/country";
		} else if (URL_COUNTRY.indexOf("db-ip.com") > -1)                   { w = "https://db-ip.com/" + CURRENT_IP;
		} else if (URL_COUNTRY.indexOf("freegeoip.net") > -1)               { w = "http://freegeoip.net/json/" + CURRENT_IP;
		} else if (URL_COUNTRY.indexOf("geoip.nekudo.com") > -1)            { w = "http://geoip.nekudo.com/api/" + CURRENT_IP;
		} else if (URL_COUNTRY.indexOf("getcitydetails.geobytes.com") > -1) { w = "http://getcitydetails.geobytes.com/GetCityDetails?fqcn=" + CURRENT_IP;
		}
		URL_IP_COUNTRY = w;
	},
	
	_process_data: function (i, s) {
		RETURN_DATA = "";	
		if (i == 0) {
			this._find_ip(s, '');  s = temp;
		} else {
			if (URL_IP_COUNTRY.indexOf("db-ip.com") > -1)                          { this._find_wd(s, '/img/flags/', '.');          s = temp;
			} else if (URL_IP_COUNTRY.indexOf("freegeoip.net") > -1)               { this._find_wd(s, '"country_code":"', '"');     s = temp;
			} else if (URL_IP_COUNTRY.indexOf("geoip.nekudo.com") > -1)            { this._find_wd(s, '"code":"', '"');             s = temp;
			} else if (URL_IP_COUNTRY.indexOf("getcitydetails.geobytes.com") > -1) { this._find_wd(s, '"geobytesinternet":"', '"'); s = temp;
			} else if (URL_IP_COUNTRY.indexOf("www.geoip-db.com") > -1)            { this._find_wd(s, '"country_code":"', '"');     s = temp;
			}
		}
		RETURN_DATA = s.trim();
	},
	
	_find_ip_country: function (word) {
		let w = word;
		if (URL_IP.indexOf("api.userinfo.io") > -1) {
			// "country":{"name":"Malaysia","code":"MY"}
			let k = w.lastIndexOf('"country":{"name":"');
			if (k > 0) {
				w = w.substr(k+19);
				k = w.indexOf('","code":"');
				w = w.substr(k+10);
				k = w.indexOf('"');
				w = w.substring(0,k);
			}
		} else if (URL_IP.indexOf("geoplugin.com") > -1) {
			let k = w.indexOf('"geoplugin_countryCode":"');
			if (k > 0) {
				w = w.substring(k+25, k+27);
			}
		} else if (URL_IP.indexOf("iplocation.net") > -1) {
			let k = w.indexOf('/assets/images/flags/');
			if (k > 0) {
				w = w.substring(k+21, k+23);
			}
		}
		
		if (w.length == 2) {
			temp = w;
		} else {
			temp = "";
		}
	},
	
	_find_ip: function (word, word_postfix) {
		let w = word;
		let k = w.search(IP_RE_IN_STR);
		if (k > 0) {
			w = w.substr(k);
			if (word_postfix == "") {
				for (k=15; k>0; k--) {
					if (w.substring(0, k).search(IP_RE) == 0)
						break;
				}
			} else {
				k = w.indexOf(word_postfix);
			}

			this._find_ip_country(w);
			RET_COUNTRY_CODE = temp;			
			
			w = w.substring(0, k);
		}
		temp = w;
	},
	
	_find_wd: function (word, word_prefix, word_postfix) {
		let w = word;
		let k = w.indexOf(word_prefix);
		if (k > 0) {
			w = w.substr(k+word_prefix.length);
			k = w.indexOf(word_postfix);
			w = w.substring(0,k);
		}
		temp = w;
	},
	
	_soup_data: function (i, param_ip) {
		let params = {};
		
		_httpSession = new Soup.Session();
		
		if (i == 0) {
			/*
			this._get_google_ip();
		
			if (GOOGLE_IP.length > 0) {
				CURRENT_IP = GOOGLE_IP;
				LST_IP = GOOGLE_IP;
				this._soup_data(1, "");
			} else {
				CURRENT_IP = "";
				LST_IP = "";
				this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
				sleep(10000);
				return;
			}
			*/
			let message = Soup.form_request_new_from_hash('GET', URL_IP, params);
			_httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
				CURRENT_IP = "";
				if (message.status_code !== 200) {
					this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
					this._change_Lookup_Service_URL(0);
				} else {
					this._process_data(0, message.response_body.data.trim());
					
					if (RETURN_DATA.match(IP_RE)) {
						CURRENT_IP = RETURN_DATA;
					}
					
					RETURN_DATA = "";
					
					if (LST_COUNTRY == null) LST_COUNTRY = "";
					
					let resume = false;
					if (CURRENT_IP.length > 0) {
						if (LST_IP !== CURRENT_IP) {
							LST_IP = CURRENT_IP;
							resume = true;
						} else {
							++redraw;
							if (redraw == 1) {
								if ((CURRENT_IP.length > 0) && (LST_COUNTRY.length == 2)) {
									this._BoxLayout.setPanelLine(CURRENT_IP, LST_COUNTRY);
									LOOP_SEC = DEFAULT_LOOP_SEC;
								}
							if (redraw == 1) { redraw = 0; }
							}
						}
					}

					if (resume == true) {
						if (RET_COUNTRY_CODE == null) {
							RET_COUNTRY_CODE = "";
						}
						if (RET_COUNTRY_CODE.length == 2) {
							LST_COUNTRY = RET_COUNTRY_CODE;
							this._BoxLayout.setPanelLine(CURRENT_IP, LST_COUNTRY);
							LOOP_SEC = DEFAULT_LOOP_SEC;
						} else {
							this._soup_data(1, CURRENT_IP);
						}
						
						RET_COUNTRY_CODE = null;
					}
				}
			}));
			message = null;
			
		} else {
			
			this._url_add_ip();
													  
			let message = Soup.form_request_new_from_hash('GET', URL_IP_COUNTRY, params);
			_httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
				if (message.status_code !== 200) {
					this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
					this._change_Lookup_Service_URL(1);
				} else {
					this._process_data(1, message.response_body.data.trim().toLowerCase());
					
					if (RETURN_DATA.match(CD_RE)) {
						let CODE = RETURN_DATA;
			
						if (CODE.length == 2) {
							LST_COUNTRY = CODE;
							this._BoxLayout.setPanelLine(CURRENT_IP, CODE);
							LOOP_SEC = DEFAULT_LOOP_SEC;
						} else {
							this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
						}
						
						CODE = null;
					} else {
						this._BoxLayout.setPanelLine(NOT_CONNECTED, DEFAULT_COUNTRY_CODE);
					}
					
					RETURN_DATA = "";
				}
			}));
			message = null;
		}
	},
	
	_loadData: function () {
		this._soup_data(0, "");
	},

	_removeTimeout: function () {
		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = null;
		}
	},
	
	_change_Lookup_Service_URL: function (i) {
		if (i == 0) {			
			for (let m = 0; m < ARR_URL_IP.length; m++) {
				if (URL_IP == ARR_URL_IP[m]) {
					if (m == ARR_URL_IP.length-1) {
						URL_IP = ARR_URL_IP[0];
					} else {
						URL_IP = ARR_URL_IP[m+1];
					}
					break;
				}
			}
		} else {
			for (let m = 0; m < ARR_URL_CODE.length; m++) {
				if (URL_COUNTRY == ARR_URL_CODE[m]) {
					if (m == ARR_URL_CODE.length-1) {
						URL_COUNTRY = ARR_URL_CODE[0];
					} else {
						URL_COUNTRY = ARR_URL_CODE[m+1];
					}
					break;
				}
			}
		}
	},
	
	_get_google_ip: function() {
		let argv = ["dig", "TXT", "+short", "o-o.myaddr.l.google.com", "@ns1.google.com"];
		let [result, output, std_err, status] = this._spawnWithPipes(argv);
		if (result) {
			if (output !== null) {
				if (output.toString().trim().length > 0) {
					if (output.toString().indexOf("not found") < 0) {
						this._find_ip(output.toString().trim(), '"'); 
						GOOGLE_IP = temp;
					} else {
						GOOGLE_IP = "";
					}
				} else {
					GOOGLE_IP = "";
				}
			} else {
				GOOGLE_IP = "";
			}
		} else {
			GOOGLE_IP = "";
		}
	},
	
	_trySpawnWithPipes: function(argv) {
        let retval = [false, null, null, -1];

        try {
            retval = GLib.spawn_sync(null, argv, null,
                                     GLib.SpawnFlags.SEARCH_PATH,
                                     null, null);
        } catch (err) {
            if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
                err.message = _("Command not found");
            } else {
                err.message = err.message.replace(/.*\((.+)\)/, '$1');
            }

            throw err;
        }
        return retval;
    },
	
	_spawnWithPipes: function(argv) {
        try {
            return this._trySpawnWithPipes(argv);
        } catch (err) {
            this._handleSpawnError(argv[0], err);
            return [false, null, err.message, -1];
        }
    },
	
	_handleSpawnError: function(command, err) {
        let title = _("Execution of '%s' failed:").format(command);
        log(title);
        log(err.message);
    },
	
	stop: function () {
		if (_httpSession !== undefined)
			_httpSession.abort();
		
		_httpSession = undefined;
		/*
		if (this._timeout)
			Mainloop.source_remove(this._timeout);
		
		this._timeout = undefined;
		*/
		// this._removeTimeout();
		this._BoxLayout.remove_all_children();
	},
	
	destroy: function () {
		this.stop();
	}
});

function _change_LOOP_SEC(n) {
	if (n < 100) {
			LOOP_SEC = n;
		} else {
			LOOP_SEC = DEFAULT_LOOP_SEC;
		}
}
