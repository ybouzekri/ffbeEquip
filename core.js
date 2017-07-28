var wikiBaseUrl = "http://exvius.gamepedia.com/";
var data;
var units;
var baseStat = 180;
var baseStats = ['hp','mp','atk','def','mag','spr'];
var filters = ["types","elements","ailments","killers","accessToRemove","additionalStat"];
var elementList = ['fire','ice','lightning','water','earth','wind','light','dark'];
var ailmentList = ['poison','blind','sleep','silence','paralysis','confuse','disease','petrification'];
var typeList = ["dagger", "sword", "greatSword", "katana", "staff", "rod", "bow", "axe", "hammer", "spear", "harp", "whip", "throwing", "gun", "mace", "fist", "lightShield", "heavyShield", "hat", "helm", "clothes", "robe", "lightArmor", "heavyArmor", "accessory", "materia"];

var stat = '';
var types = [];
var elements = [];
var ailments = [];
var killers = [];
var accessToRemove = [];
var additionalStat = [];
var searchText = '';
var selectedUnit = '';
var defaultFilter = {};


// Main function, called at every change. Will read all filters and update the state of the page (including the results)
var update = function() {
	
	readFilterValues();
	updateFilterHeadersDisplay();
    modifyFilterSummary();
    modifyUrl();

    if (stat.length == 0 && searchText.length == 0 && types.length == 0 && elements.length == 0 && ailments.length == 0 && killers == 0 && accessToRemove.length == 0 && additionalStat.length == 0) {
		// Empty filters => no results
        $("#results tbody").html("");
        $("#results").addClass("notSorted");
        $("#resultNumber").html("Add filters to see results");
        return;
    }
	
	// If the result are to be sorted by a stat, display the stat column, else hide it.
    if (stat.length != 0) {
        $("#statTitle").text(stat);    
        $("#results").removeClass("notSorted");
    } else {
        $("#results").addClass("notSorted");
    }
    
	// filter, sort and display the results
    displayItems(sort(filter()));
	
	// If the text search box was used, highlight the corresponding parts of the results
    $("#results").unmark({
        done: function() {
            if (searchText && searchText.length != 0) {
                searchText.split(" ").forEach(function (token) {
                    $("#results").mark(token);
                });
            }
        }
    });
}

// Read filter values into the corresponding variables
var readFilterValues = function() {
	searchText = $("#searchText").val();
	stat = getSelectedValuesFor("stats");
    stat = stat[0] || '';
	if (baseStats.includes(stat)) {
		baseStat = parseInt($("#baseStat_" + stat).val());
		if (isNaN(baseStat)) {
			if (stat == 'hp') {
				baseStat=3500;
				$("#baseStat").attr("placeholder", 3500);
			} else {
				baseStat=180;
				$("#baseStat").attr("placeholder", 180);
			}
		}	
	} else {
		baseStat = 0;
	}
    
    types = getSelectedValuesFor("types");
    elements = getSelectedValuesFor("elements");
    ailments = getSelectedValuesFor("ailments");
    killers = getSelectedValuesFor("killers");
    accessToRemove = getSelectedValuesFor("accessToRemove");
    additionalStat = getSelectedValuesFor("additionalStat");
}

// Get the values for a filter type
var getSelectedValuesFor = function(type) {
    var values = [];
        $('.active input[name='+ type +']').each(function() {
            values.push($(this).val());
        });
    return values;
};

// Hide or show the "unselect all", "select unit weapons" and so on in the filter headers
var updateFilterHeadersDisplay = function() {
	$(filters).each(function(index, filter) {
		// If filter has a value selected, display "unselect all" link
        $("."+ filter + " .unselectAll").toggleClass("hidden", window[filter].length == 0); 
		// If filter has unit specific link and a unit is selected, display those links
        $("."+ filter + " .forUnit").toggleClass("hidden", !selectedUnit); 
    });
    $(".stat .unselectAll").toggleClass("hidden", stat.length == 0); 
}

// Update the hash of the url to reflect the currently selected filter
var modifyUrl = function() {
    var state = {
    };
    if (stat && stat.length != 0) {
        state.stat = stat;
    }
    $(filters).each(function (index, filter) {
        if (window[filter].length != 0) {
            state[filter] = window[filter];
        }
    });
    if (searchText && searchText.length != 0) {
        state.search = searchText;
    }
    if (selectedUnit) {
        state.unit = selectedUnit;
    }
	$(baseStats).each(function (index, value) {
		var statValue = $("#baseStat_" + value).val();
		if (statValue) {
			if (!state.baseStats) {
				state.baseStats =  {};
			}
			state.baseStats[value] = statValue;
		}
	});
    window.location.hash = '#' + window.btoa(unescape(encodeURIComponent(JSON.stringify(state))));
};

// Update the filter summary (small icons of the filter on the right, on mobile view only)
var modifyFilterSummary = function() {
    var html = "";
    if (types.length != 0) {
        for (var index in types) {
			html += '<img src="img/' + types[index] + '.png"></img>'
        }
    }
    if (elements.length != 0) {
        for (var index in elements) {
			html += '<img src="img/' + elements[index] + '.png"></img>'
        }
    }
    if (ailments.length != 0) {
        for (var index in ailments) {
			html += '<img src="img/' + ailments[index] + '.png"></img>'
        }
    }
    if (killers.length != 0) {
        html += '<img src="img/killer.png"></img>'
    }
    $("#filterSummary").html(html);
}

// Filter the items according to the currently selected filters. Also if sorting is asked, calculate the corresponding value for each item
var filter = function() {
    var result = [];
    data.each(function(index, item) {
        if (types.length == 0 || types.includes(item.type)) {
            if (elements.length == 0 || elements.includes(item.element) || (elements.includes("noElement") && !item.element) || (item.resist && matches(elements, item.resist.map(function(resist){return resist.name;})))) {
                if (ailments.length == 0 || (item.ailments && matches(ailments, item.ailments.map(function(ailment){return ailment.name;}))) || (item.resist && matches(ailments, item.resist.map(function(res){return res.name;})))) {
                    if (killers.length == 0 || (item.killers && matches(killers, item.killers.map(function(killer){return killer.name;})))) {
                        if (accessToRemove.length == 0 || haveAuthorizedAccess(accessToRemove, item)) {
                            if (additionalStat.length == 0 || hasStats(additionalStat, item)) {
                                if (searchText.length == 0 || containsText(searchText, item)) {
                                    if (selectedUnit.length == 0 || !exclusiveForbidAccess(item)) {
                                        if (stat.length == 0 || hasStat(stat, item)) {
                                            calculateValue(item, stat, ailments, elements, killers);
                                            result.push(item);
                                        }
                                    }
                                }
                            }
                        } 
                    }
                }
            }
        }
    })
    return result;
};

// Return true if the two arrays share at least one value
var matches = function(array1, array2) {
    var match = false;
    $(array1).each(function(index, value) {
        if (array2.includes(value)) {
            match = true;
        }
    });
    return match;
};

// Return true if the item is exclusive to something that does not matches the selected unit
var exclusiveForbidAccess = function(item) {
    if (item.exclusiveSex && units[selectedUnit].sex != item.exclusiveSex) {
        return true;
    }
    if (item.exclusiveUnits && !item.exclusiveUnits.includes(selectedUnit)) {
        return true;
    }
    return false;
}

// Return true if the various fields of the items contains all the searched terms
var containsText = function(text, item) {
    var textToSearch = item["name"] + "|" + getStatDetail(item);
    if (item["evade"]) {
        textToSearch += "|" + "Evade " + item.evade + "%";
    }
    if (item["resist"]) {
        $(item["resist"]).each(function (index, resist) {
            textToSearch += "|" + resist.name;
        });
    }
    if (item["ailments"]) {
        $(item["ailments"]).each(function (index, ailment) {
            textToSearch += "|" + ailment.name;
        });
    }
    if (item["exclusiveUnits"]) {
        textToSearch += "|Only ";
        var first = true;
        $(item.exclusiveUnits).each(function(index, exclusiveUnit) {
            if (first) {
                first = false;
            } else {
                textToSearch += ", ";
            }
            textToSearch += exclusiveUnit;
        });
    }
    if (item["exclusiveSex"]) {
        textToSearch += "|Only " + item["exclusiveSex"]; 
    }
    if (item["condition"]) {
        textToSearch += "|Only " + item["condition"]; 
    }
    if (item["special"]) {
        $(item["special"]).each(function (index, special) {
            textToSearch += "|" + special;
        });
    }
    if (item["tmrUnit"]) {
        textToSearch += "|" + item["tmrUnit"]; 
    }
    var result = true;
    text.split(" ").forEach(function (token) {
        result = result && textToSearch.match(new RegExp(escapeRegExp(token),'i'));
    });
    return result;
};

// Escape RegExp special character if the user used them in his search
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Return true if the item has the required stat
var hasStat = function(stat, item) {
    return item[stat] || item[stat+'%'] || (stat == 'inflict' && (item.element || item.ailments || item.killers)) || (stat == 'resist' && item.resist);
};

// Return true if the item has all the required stats
var hasStats = function(additionalStat, item) {
    var match = true;
    $(additionalStat).each(function(index, addStat) {
        if (!item[addStat] && !item[addStat + '%']) {
            match = false;
        }
    });
    return match;
};

// Return true if the item has at least one access that is not forbidden by filters
var haveAuthorizedAccess = function(forbiddenAccessList, item) {
    var hasAccess = false;
    if (forbiddenAccessList.includes("unitExclusive") && item.exclusiveUnits) {
        return false;
    }
    $(item.access).each(function(index, itemAccess) {
        hasAccess |= isAccessAllowed(forbiddenAccessList, itemAccess);
    });
    return hasAccess;
};

// Return true if one access is not forbidden by filters
var isAccessAllowed = function(forbiddenAccessList, access) {
    var accessAllowed = true;
    $(forbiddenAccessList).each(function (index, accessToSplit) {
        $(accessToSplit.split('/')).each(function(index, forbiddenAccess) {
            if (access.startsWith(forbiddenAccess) || access.endsWith(forbiddenAccess)) {
                accessAllowed = false;
            }    
        });
    });
    return accessAllowed;
};

// If sort is required, this calculate the effective value of the requested stat, based on the unit stat for percentage increase.
var calculateValue = function(item) {
    var calculatedValue = 0;
    if (item[stat]) {
        calculatedValue = item[stat];
    } 
    if (item[stat + '%']) {
        calculatedValue += item[stat+'%'] * baseStat / 100;
    }
    if (stat == 'inflict' && (item.ailments || item.killers)) {
        var maxValue = 0;
        $(item.ailments).each(function(index, ailment) {
            if ((ailments.length == 0 || ailments.includes(ailment.name)) && ailment.percent > maxValue) {
                maxValue = ailment.percent;
            }
        });
        $(item.killers).each(function(index, killer) {
            if ((killers.length == 0 || killers.includes(killer.name)) && killer.percent > maxValue) {
                maxValue = killer.percent;
            }
        });
        calculatedValue = maxValue;
    }
    if (stat == 'resist' && (item.resist)) {
        var maxValue = 0;
        $(item.resist).each(function(index, res) {
            if (ailmentList.includes(res.name) && (ailments.length == 0 || ailments.includes(res.name)) && res.percent > maxValue) {
                maxValue = res.percent;
            }
            if (elementList.includes(res.name) && (elements.length == 0 || elements.includes(res.name)) && res.percent > maxValue) {
                maxValue = res.percent;
            }
        });
        calculatedValue = maxValue;
    }
    $(item).attr('calculatedValue', calculatedValue);
};

// Sort by calculated value (will be 0 if not sort is asked) then by name
var sort = function(items) {
    return items.sort(function (item1, item2){
		if (item2.calculatedValue == item1.calculatedValue) {
			return item1.name.localeCompare(item2.name);
		} else {
			return item2.calculatedValue - item1.calculatedValue;
		}
    });
};

// Construct HTML of the results. String concatenation was chosen for rendering speed.
var displayItems = function(items) {
    var html = "";
    $(items).each(function (index, item){
        html += '<div class="tr">';
        
        // type
        html += '<div class="td type">';
        if (item.special && item.special.includes("notStackable")) {
            html += "<img class='miniIcon left' src='img/notStackable.png' title='Not stackable'>";
        }
        if (item.special && item.special.includes("twoHanded")) {
            html += "<img class='miniIcon left' src='img/twoHanded.png' title='Two-handed'>";
        }
        html += "<img src='img/" + item.type + ".png'></img></div>";
        
        // name
        html += '<div class="td name"><a href="' + toUrl(item.name) + '">' + item.name + "</a>";
		if (item.outclassedBy) {
			html += '<img src="img/gil.png" class="outclassedByIcon" title="Can be sold. Strictly outclassed by ' + item.outclassedBy + '"></img>'
		}
		html += "<div class='detail'>" + getStatDetail(item) + "</div></div>";
        
        // value
        html += '<div class="td value sort">' + item.calculatedValue;
        if (stat == 'inflict' || stat == 'evade' || stat == 'resist') {
            html += '%';
        }
        html += "</div>";
        
		
		
        // special
        html += '<div class="td special">';
        
        if (item.element) {
            html += "<div class='specialImg'><img class='miniIcon' src='img/sword.png'></img><img src='img/" + item.element + ".png'></img></div>"
        }
        if (item.ailments) {
            $(item.ailments).each(function(index, ailment) {
                html += "<div class='specialImg noWrap'><img class='miniIcon' src='img/sword.png'></img><img class='imageWithText' src='img/" + ailment.name + ".png'></img>" + ailment.percent + "%</div>";
            });
        }
        if (item.resist) {
            $(item.resist).each(function(index, resist) {
                html += "<div class='specialImg noWrap";
                if ((elementList.includes(resist.name) && elements.length != 0 && !elements.includes(resist.name)) || (ailmentList.includes(resist.name) && ailments.length != 0 && !ailments.includes(resist.name))) {
                    html += " notSelected";
                }
                html += "'><img class='miniIcon' src='img/heavyShield.png'></img><img class='imageWithText' src='img/" + resist.name + ".png'></img>" + resist.percent + "%</div>";
            });
        }
        
        if (item.killers) {
            $(item.killers).each(function(index, killer) {
                html += "<div class='specialImg noWrap";
                if (killers.length != 0 && !killers.includes(killer.name)) {
                    html += " notSelected";
                }
                html += "'><img class='imageWithText' src='img/killer.png'></img>" + killer.name + " " + killer.percent + "%</div>";
            });
        }
        var special = "";
        if (item.evade) {
            special += "<li>Evade " + item.evade + "%</li>";
        }
        
        if (item.special) {
            $(item.special).each(function(index, itemSpecial) {
                if (itemSpecial != "twoHanded" && itemSpecial != "notStackable") {
                    special += "<li>" + toHtml(itemSpecial) + "</li>";
                }
            });
        }
        if (special.length != 0) {
            html += "<ul>" + special + "<ul>";
        }
        html += "</div>";
        
        
        //access
        html += '<div class="td access">';
        $(item.access).each(function(index, itemAccess) {
            html += "<div"; 
            if (accessToRemove.length != 0 && !isAccessAllowed(accessToRemove, itemAccess)) {
                html += " class='notSelected forbiddenAccess'";
            }
            html += ">" + itemAccess + "</div>"; 
        });
        if (item.tmrUnit) {
            html += '<div><a href="' + toUrl(item.tmrUnit) + '">' + item.tmrUnit + '</a></div>';
        }
        if (item.exclusiveUnits) {
            html += "<div class='exclusive'>Only ";
            var first = true;
            $(item.exclusiveUnits).each(function(index, exclusiveUnit) {
                if (first) {
                    first = false;
                } else {
                    html += ", ";
                }
                html += '<a href="' + toUrl(exclusiveUnit) + '">' + exclusiveUnit + '</a>';
            });
            html += "</div>";
        }
        if (item.exclusiveSex) {
            html += "<div class='exclusive'>Only " + item.exclusiveSex + "</div>";
        }
        if (item.condition) {
            html += "<div class='exclusive'>" + toHtml(item.condition) + "</div>";
        }
        html += "</div>";
        
        html += "</div>";
    });
    $("#results .tbody").html(html);
    $("#resultNumber").html(items.length);
};

// Create an HTML span containing the stats of the item
var getStatDetail = function(item) {
    var detail = "";
    var stats = ['hp', 'mp', 'atk', 'def', 'mag', 'spr'];
    var first = true;
    $(stats).each(function(index, stat) {
        var statNotSelected = additionalStat.length != 0 && !additionalStat.includes(stat) && stat != window["stat"];
        if (statNotSelected) {
            detail += "<span class='notSelected'>";
        }
        if (item[stat]) {
            if (first) {
                first = false;
            } else {
                detail += ', ';
            }
            detail += stat + '+' + item[stat];
        }
        if (item[stat+'%']) {
            if (first) {
                first = false;
            } else {
                detail += ', ';
            }
            detail += stat + '+' + item[stat+'%'] + '%';
        }
        if (statNotSelected) {
            detail += "</span>";
        }
    });
    return detail;
};

// Some field in the data can use a special syntax to display link to the wiki. This is done by using brace ( blabla [name] blabla). This replace the parts inside braces by html links.
var toHtml = function(text) {
    var textWithAddedAnchors = text.replace(/(\[[^\]]*\])/g, function(v) {
        var vWithoutBrace = v.substring(1, v.length - 1); 
        return "<a href='"+ toUrl(vWithoutBrace) +"'>"+vWithoutBrace+"</a>"; 
    });
    return "<span>" + textWithAddedAnchors +"</span>";
};

// Return the wiki url corresponding to the name
var toUrl = function(name) {
    return wikiBaseUrl + name.replace(' ', '_');
};

// Function used to know if a keyboard key pressed is a number, to prevent non number to be entered
function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if ( (charCode > 31 && charCode < 48) || charCode > 57) {
        return false;
    }
    return true;
};

// Unselect all values for a filter of the given type. if runUpdate = true, then call update() function
function unselectAll(type, runUpdate = true) {
    $('.active input[name='+ type +']').each(function(index, checkbox) {
        $(checkbox).prop('checked', false);
        $(checkbox).parent().removeClass('active');
    });
    if (runUpdate) {
        update();
    }
};

// Called when the page is loaded. Read the url hash, extract filters from that and populate them
function loadHash() {
    var state;
    if (window.location.hash != '') {
        if (window.location.hash.substring(1).startsWith('{')) {
            state = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
        } else {
            state = JSON.parse(decodeURIComponent(escape(window.atob(window.location.hash.substring(1)))));
        }
    } else {
        state = defaultFilter;
    }
	if (state.baseStats) {
		for (var stat in state.baseStats) {
			$("#baseStat_" + stat).val(state.baseStats[stat]);
		}
	}
    if (state.unit) {
        $('#unitsSelect option[value="' + state.unit + '"]').prop("selected", "selected");
        selectedUnit = state.unit;
    }
    if (state.stat) {
        $("input[name='stats'][value='"+ state.stat +"']").each(function(index, checkbox) {
            $(checkbox).prop('checked', true);
            $(checkbox).parent().addClass('active');
        });
    }
    if (state.search) {
        $("#searchText").val(state.search);
    }
    $(filters).each(function (index, filter) {
        if (state[filter]) {
            select(filter, state[filter]);
        }
    });
};

// Selects the provided values on the filter of the provided type
function select(type, values) {
    $(values).each(function (index, value) {
        $("input[name='"+ type +"'][value='"+ value +"']").each(function(index, checkbox) {
            $(checkbox).prop('checked', true);
            $(checkbox).parent().addClass('active');
        });
    }) ;
};

// Select on the 'types' filter the provided values that match the selected unit equipable item types
function selectForUnit(values) {
    var unitEquip = units[selectedUnit].equip;
    select("types", $.grep(values, function (value) {
        return unitEquip.includes(value);
    }));
};

// Populate the unit html select with a line per unit
function populateUnitSelect() {
    var options = '<option value="custom">Custom</option>';
    Object.keys(units).sort().forEach(function(value, index) {
        options += '<option value="'+ value + '">' + value + '</option>';
    });
    $("#unitsSelect").html(options);
    $("#unitsSelect").change(function() {
        $( "#unitsSelect option:selected" ).each(function() {
            var selectedUnitData = units[$(this).val()];
            if (selectedUnitData) {
                selectedUnit = $(this).val();
                $(baseStats).each(function (index, stat) {
                    $("#baseStat_" + stat).val(selectedUnitData.stats.maxStats[stat] + selectedUnitData.stats.pots[stat]);
		      	});
                unselectAll("types", false);
            } else {
                selectedUnit = '';
                $(baseStats).each(function (index, stat) {
                    $("#baseStat_" + stat).val("");
		      	});
            }
        });
        update();
    });
}

// will be called by jQuery at page load)
$(function() {
    // Triggers on unit base stats change
	$(baseStats).each(function (index, value) {
			$("#baseStat_" + value).on("input", $.debounce(300,update));
	});
	
	// Triggers on search text box change
    $("#searchText").on("input", $.debounce(300,update));
    
	// Ajax calls to get the item and units data, then populate unit select, read the url hash and run the first update
    $.get("data.json", function(result) {
        data = $(result);
        $.get("units.json", function(result) {
            units = result;
            populateUnitSelect();
            loadHash();
            update();
        }, 'json').fail(function(jqXHR, textStatus, errorThrown ) {
            alert( errorThrown );
        });
    }, 'json').fail(function(jqXHR, textStatus, errorThrown ) {
        alert( errorThrown );
    });
	
	// Populates the various filters
	
	// Desired Stats
	addTextChoicesTo("stats",'radio',{'HP':'hp', 'MP':'mp', 'ATK':'atk', 'DEF':'def', 'MAG':'mag', 'SPR':'spr', 'Evade':'evade', 'Inflict':'inflict', 'Resist':'resist'});
	// Item types
	addImageChoicesTo("types",typeList);
	// Elements
	addImageChoicesTo("elements",["fire", "ice", "lightning", "water", "wind", "earth", "light", "dark", "noElement"]);
	// Ailments
	addImageChoicesTo("ailments",ailmentList);
	// Killers
	addTextChoicesTo("killers",'checkbox',{'Aquatic':'aquatic', 'Beast':'beast', 'Bird':'bird', 'Bug':'bug', 'Demon':'demon', 'Dragon':'dragon', 'Human':'human', 'Machine':'machine', 'Plant':'plant', 'Undead':'undead', 'Stone':'stone', 'Spirit':'spirit'});
	// Access to remove
	addTextChoicesTo("accessToRemove",'checkbox',{ 'Shop':'shop', 'Story':'chest/quest', 'Key':'key', 'Colosseum':'colosseum', 'TMR 1*/2*':'TMR-1*/TMR-2*', 'TMR 3*/4*':'TMR-3*/TMR-4*', 'TMR 5*':'TMR-5*', 'Event':'event', 'Recipe':'recipe', 'Trophy':'trophy', 'Chocobo':'chocobo', 'Trial':'trial', 'Unit exclusive':'unitExclusive' });
	// Additional stat filter
	addTextChoicesTo("additionalStat",'checkbox',{'HP':'hp', 'MP':'mp', 'ATK':'atk', 'DEF':'def', 'MAG':'mag', 'SPR':'spr'});
	
	
	// Triggers on filter selection
	$('.choice input').change($.debounce(300,update));
});

// Add text choices to a filter. Type can be 'radio' of 'checkbox', depending if you want only one selection, or allow many.
function addTextChoicesTo(targetId, type, valueMap) {
	var target = $("#" + targetId);
	for (var key in valueMap) {
		addTextChoiceTo(target, targetId, type, valueMap[key], key);
	}
}

// Add image choices to a filter.
function addImageChoicesTo(targetId, valueList) {
	var target = $("#" + targetId);
	for (i = 0; i < valueList.length; i++) {
		addImageChoiceTo(target, targetId, valueList[i]);
	}
}

// Add one text choice to a filter
function addTextChoiceTo(target, name, type, value, label) {
	target.append('<label class="btn btn-default"><input type="' + type +'" name="' + name + '" value="'+value+'" autocomplete="off">'+label+'</label>');
}

// Add one image choice to a filter
function addImageChoiceTo(target, name, value) {
	target.append('<label class="btn btn-default"><input type="checkbox" name="' + name + '" value="'+value+'" autocomplete="off"><img src="img/'+value+'.png"/></label>');
}

