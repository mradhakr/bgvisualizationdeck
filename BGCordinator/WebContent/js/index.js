Object.prototype.equals = function(x) {
	var p;
	for (p in this)
		if (typeof (x[p]) == 'undefined')
			return false;
	for (p in this) {
		if (this[p]) {
			switch (typeof (this[p])) {
			case 'object':
				if (!this[p].equals(x[p]))
					return false;
				break;
			case 'function':
				if (typeof (x[p]) == 'undefined'
						|| (p != 'equals' && this[p].toString() != x[p]
								.toString()))
					return false;
				break;
			default:
				if (this[p] != x[p])
					return false;
			}
		} else if (x[p])
			return false;
	}
	for (p in x)
		if (typeof (this[p]) == 'undefined')
			return false;
	return true;
}

var Functions = {
	Y : null,
	LoopInterval : 5000,
	daInterval : null,
	zIndex : 0,
	Elements : {},
	Activate : function(rel) {
		var Y = Functions.Y;
		Y.all('#daNav>ul>li[rel="' + rel + '"]').each(function(li) {
			li.addClass('active');
		});

		// Y.one('#daBody>div[rel="'+rel+'"]').setStyle('display',
		// 'block').setStyle('visibility', 'hidden');
		if (rel) {
			Functions.GenerateTitle(rel);
			clearInterval(Functions.daInterval);
			setTimeout(function() {
				Functions.PopulateData(true);
				Functions.daInterval = setInterval(Functions.PopulateData,
						Functions.LoopInterval);
			}, 0);
			Functions.Y.all('#daBody>div.Latest').setStyle('display', 'none')
					.remove(true);
		}
	},
	PopulateData : function(force) {
		if (!force)
			force = false;
		if (!force && Functions.PopulateTimestamp == Data.LoadTimestamp) {
			console.log("No Data Change!");
			return;
		}
		console.log("Change Data");
		Functions.PopulateTimestamp = Data.LoadTimestamp;
		var Y = Functions.Y, rel = Y.one('#daNav>ul>li.active[rel]')
				.getAttribute("rel");
		/*
		 * Y.all('#daBody>div[rel]').each(function(div) { div = Y.one(div);
		 * div.all("[aria-label]").each(function(n) {
		 * n.setHTML(Data.Get(n.get('aria-label').split('.'))); }); });
		 */
		setTimeout(function() {
			Functions.PopulateThePage(rel)
		}, 200);
	},
	PopulateKeyValues : function(newDiv) {
		newDiv
				.all("ul.key-value")
				.each(
						function(ul) {
							ul.setStyle('width',
									100 * (Number(ul.getComputedStyle("width")
											.replace(/\..*/, '').replace(
													/[^0-9]+/, '')) + 10) / 75);
							ul.all('li').setStyle('float', 'left');
							ul.get('parentNode').setStyle(
									'width',
									(Number(ul.getComputedStyle("width")
											.replace(/\..*/, '').replace(
													/[^0-9]+/, '')) + 100)
											+ 'px');
						});
		newDiv.all("[aria-label]").each(function(n) {
			n.setHTML(Data.Get(n.get('aria-label').split('.')));
		});
	},
	PopulateThePage : function(rel) {
		if (!rel)
			return;
		var Y = Functions.Y, newDiv = Y.Node.create(
				'<div class="Latest">'
						+ Y.one('#daBody>div[rel="' + rel + '"]').getHTML()
						+ '</div>').setStyle('zIndex', 5 + Functions.zIndex++);// .setStyle('visibility',
		// 'hidden');
		Y.all('#daBody>div.Latest').addClass('Older').removeClass('Latest');
		Y.one('#daBody').append(newDiv);
		Functions.PopulateKeyValues(newDiv);
		switch (rel) {
		case 'Social Op Rating':
			var stats = Data.GetLast('Statistics');
			// The Table
			Functions.Elements.SocialOpData = new Y.DataTable(
					{
						columns : [
								{
									key : "Type",
									label : "ID"
								},
								{
									key : "PortNumber",
									label : "Port",
									formatter : Data.PercTwoFormatter
								},
								{
									key : "WorkloadPercentage",
									label : "Workload",
									formatter : Data.PercTwoFormatter
								},
								{
									key : "Threads",
									label : "Socialites",
									formatter : "<div style='text-align:center'>{value}</div>",
									allowHTML : true
								} ],
						data : stats,
						autoSync : true,
						strings : {
							emptyMessage : "<div style='text-align:center'>No data available!</div>"
						}
					});
			Functions.Elements.SocialOpData.render(newDiv.one('#SocialOpData'));
			// The Node Seletor
			Functions.Elements.SocialOpSelect = newDiv.one('#SocialOpSelect');
			for ( var i in stats)
				if (stats.hasOwnProperty(i))
					Functions.Elements.SocialOpSelect.append(Y.Node
							.create('<option value="' + stats[i].Type + '">'
									+ stats[i].Type + '</option>'));
			Functions.Elements.SocialOpSelect.on('change',
					Functions.ReDrawSocialOpGraphs);
			// The 3 Graphs
			Functions.Elements.SocialOpGraphDiv1 = Y.Node
					.create('<div class="graph"></div>');
			Functions.Elements.SocialOpGraphDiv2 = Y.Node
					.create('<div class="graph"></div>');
			Functions.Elements.SocialOpGraphDiv3 = Y.Node
					.create('<div class="graph"></div>');
			newDiv.one("#SocialOpGraphs").append(
					Functions.Elements.SocialOpGraphDiv1).append(
					Functions.Elements.SocialOpGraphDiv2).append(
					Functions.Elements.SocialOpGraphDiv3);
			Functions.Elements.SocialOpGraphDiv1.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.SocialOpGraphDiv1
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);
			Functions.Elements.SocialOpGraphDiv2.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.SocialOpGraphDiv2
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);
			Functions.Elements.SocialOpGraphDiv3.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.SocialOpGraphDiv3
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);

			var graphThroughput = [], graphConfidence = [], graphStaleness = [], stats = Data
					.Get('Results');
			Functions.Elements.SocialOpGraphThreads = {};
			for ( var i in stats)
				if (stats.hasOwnProperty(i)) {
					var threads = 0;
					for ( var j in stats[i])
						if (stats[i].hasOwnProperty(j)
								&& stats[i][j].Type == 'Overall') {
							threads = stats[i][j].Threads;
							break;
						}
					var oThroughput = {
						Threads : threads
					}, oConfidence = {
						Threads : threads
					}, oStaleness = {
						Threads : threads
					};
					for ( var j in stats[i])
						if (stats[i].hasOwnProperty(j)) {
							oThroughput[stats[i][j].Type] = Math
									.round(100 * stats[i][j].Throughput) / 100;
							oConfidence[stats[i][j].Type] = Math
									.round(10000 * stats[i][j].Confidence) / 10000;
							oStaleness[stats[i][j].Type] = Math
									.round(10000 * stats[i][j].Staleness) / 10000;
							if (typeof (Functions.Elements.SocialOpGraphThreads[stats[i][j].Type]) == 'undefined')
								Functions.Elements.SocialOpGraphThreads[stats[i][j].Type] = [];
							Functions.Elements.SocialOpGraphThreads[stats[i][j].Type][i] = stats[i][j].Threads;
						}
					graphThroughput.push(oThroughput);
					graphConfidence.push(oConfidence);
					graphStaleness.push(oStaleness);
				}

			Functions.Elements.SocialOpGraph1 = new Y.Chart(
					{
						dataProvider : graphThroughput,
						legend : {
							position : "right",
							styles : {
								hAlign : "center",
								item : {
									label : {
										paddingLeft : 4,
										paddingBottom : 1
									}
								}
							}
						},
						categoryKey : "Threads",
						axes : {
							values : {
								title : "Throughput",
								alwaysShowZero : false
							},
							Threads : {
								title : "Socialites"
							}
						},
						horizontalGridlines : true,
						styles : {
							axes : {
								values : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								},
								Threads : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								}
							}
						},
						render : Functions.Elements.SocialOpGraphDiv1,
						tooltip : {
							styles : {
								textAlign : "left"
							},
							allowHTML : true,
							markerLabelFunction : function(categoryItem,
									valueItem, itemIndex, series, seriesIndex) {
								return Y.Node
										.create('<div><strong>ID:</strong>&nbsp;'
												+ valueItem.displayName
												+ '<br /><strong>'
												+ valueItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ valueItem.value
												+ '<br /><strong>'
												+ categoryItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ Functions.Elements.SocialOpGraphThreads[valueItem.displayName][itemIndex]
												+ '</div>')
							}
						},
					});
			for ( var i = 0; i < Functions.Elements.SocialOpGraph1._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph1.getSeries(
						Functions.Elements.SocialOpGraph1._seriesKeys[i]).set(
						"styles", {
							line : {
								weight : 3
							}
						});

			Functions.Elements.SocialOpGraph2 = new Y.Chart(
					{
						dataProvider : graphConfidence,
						legend : {
							position : "right",
							styles : {
								hAlign : "center",
								item : {
									label : {
										paddingLeft : 4,
										paddingBottom : 1
									}
								}
							}
						},
						categoryKey : "Threads",
						axes : {
							values : {
								type : "numeric",
								title : "Confidence", /* maximum:100, */
								labelFormat : {
									suffix : "%"
								},
								alwaysShowZero : false
							},
							Threads : {
								title : "Socialites"
							}
						},
						horizontalGridlines : true,
						styles : {
							axes : {
								values : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								},
								Threads : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								}
							}
						},
						render : Functions.Elements.SocialOpGraphDiv2,
						tooltip : {
							styles : {
								textAlign : "left"
							},
							allowHTML : true,
							markerLabelFunction : function(categoryItem,
									valueItem, itemIndex, series, seriesIndex) {
								return Y.Node
										.create('<div><strong>ID:</strong>&nbsp;'
												+ valueItem.displayName
												+ '<br /><strong>'
												+ valueItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ valueItem.value
												+ '%<br /><strong>'
												+ categoryItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ Functions.Elements.SocialOpGraphThreads[valueItem.displayName][itemIndex]
												+ '</div>')
							}
						}
					});
			for ( var i = 0; i < Functions.Elements.SocialOpGraph2._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph2.getSeries(
						Functions.Elements.SocialOpGraph2._seriesKeys[i]).set(
						"styles", {
							line : {
								weight : 3
							}
						});

			Functions.Elements.SocialOpGraph3 = new Y.Chart(
					{
						dataProvider : graphStaleness,
						legend : {
							position : "right",
							styles : {
								hAlign : "center",
								item : {
									label : {
										paddingLeft : 4,
										paddingBottom : 1
									}
								}
							}
						},
						categoryKey : "Threads",
						axes : {
							values : {
								type : "numeric",
								title : "Staleness", /* maximum:100, */
								labelFormat : {
									suffix : "%"
								},
								alwaysShowZero : false
							},
							Threads : {
								title : "Socialites"
							}
						},
						horizontalGridlines : true,
						styles : {
							axes : {
								values : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								},
								Threads : {
									label : {
										color : "#95C78C"
									},
									title : {
										color : "#95C78C",
										fontSize : "100%"
									}
								}
							}
						},
						render : Functions.Elements.SocialOpGraphDiv3,
						tooltip : {
							styles : {
								textAlign : "left"
							},
							allowHTML : true,
							markerLabelFunction : function(categoryItem,
									valueItem, itemIndex, series, seriesIndex) {
								return Y.Node
										.create('<div><strong>ID:</strong>&nbsp;'
												+ valueItem.displayName
												+ '<br /><strong>'
												+ valueItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ valueItem.value
												+ '%<br /><strong>'
												+ categoryItem.axis._titleTextField.textContent
												+ ':</strong>&nbsp;'
												+ Functions.Elements.SocialOpGraphThreads[valueItem.displayName][itemIndex]
												+ '</div>')
							}
						}
					});
			for ( var i = 0; i < Functions.Elements.SocialOpGraph3._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph3.getSeries(
						Functions.Elements.SocialOpGraph3._seriesKeys[i]).set(
						"styles", {
							line : {
								weight : 3
							}
						});

			break;
		case 'Machine Health':
			var stats = Data.GetLast('Statistics');
			Functions.Elements.MachineHealthSelect = newDiv
					.one('#MachineHealthSelect');
			for ( var i in stats)
				if (stats.hasOwnProperty(i)
						&& stats[i].Type.toLowerCase() != 'overall')
					Functions.Elements.MachineHealthSelect.append(Y.Node
							.create('<option value="' + stats[i].Type + '">'
									+ stats[i].Type + '</option>'));
			Functions.Elements.MachineHealthSelect.on('change',
					Functions.ReDrawMachineHealthGraphs);
			Functions.Elements.MachineHealthGraphDiv1 = Y.Node
					.create('<div class="graph"></div>');
			Functions.Elements.MachineHealthGraphDiv2 = Y.Node
					.create('<div class="graph"></div>');
			Functions.Elements.MachineHealthGraphDiv3 = Y.Node
					.create('<div class="graph"></div>');
			Functions.Elements.MachineHealthGraphDiv4 = Y.Node
					.create('<div class="graph"></div>');
			newDiv.one("#MachineHealthGraphs").append(
					Functions.Elements.MachineHealthGraphDiv1).append(
					Functions.Elements.MachineHealthGraphDiv2).append(
					Functions.Elements.MachineHealthGraphDiv3).append(
					Functions.Elements.MachineHealthGraphDiv4);
			Functions.Elements.MachineHealthGraphDiv1.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.MachineHealthGraphDiv1
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);
			Functions.Elements.MachineHealthGraphDiv2.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.MachineHealthGraphDiv2
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);
			Functions.Elements.MachineHealthGraphDiv3.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.MachineHealthGraphDiv3
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);
			Functions.Elements.MachineHealthGraphDiv4.setStyle(
					'width',
					Math.floor(Number(Functions.Elements.MachineHealthGraphDiv4
							.getComputedStyle("width").replace(/\..*/, '')
							.replace(/[^0-9]+/, '')) - 30)).setStyle(
					"marginRight", 30).setStyle("marginTop", 50);

			stats = Data.Get('Statistics');
			var graphAvailMem = [], graphAvgDiskQLen = [], graphCPUUsage = [], graphNetwrokBW = [];
			for ( var i = 0; i < stats.length; i++) {
				var oAvailMem = {
					Time : i + 1
				}, oAvgDiskQLen = {
					Time : i + 1
				}, oCPUUsage = {
					Time : i + 1
				}, oNetwrokBW = {
					Time : i + 1
				};
				for ( var j in stats[i])
					if (stats[i].hasOwnProperty(j)
							&& stats[i][j].Type.toLowerCase() != 'overall') {
						oAvailMem[stats[i][j].Type] = Math
								.round(100 * stats[i][j].AvailMem / 1048576) / 100;
						oAvgDiskQLen[stats[i][j].Type] = Math
								.round(10000 * stats[i][j].AvgDiskQLen) / 10000;
						oCPUUsage[stats[i][j].Type] = Math
								.round(stats[i][j].CPUUsage);
						oNetwrokBW[stats[i][j].Type] = Math
								.round(100 * 8 * stats[i][j].NetworkBW / 1048576) / 100;
					}
				graphAvailMem.push(oAvailMem);
				graphAvgDiskQLen.push(oAvgDiskQLen);
				graphCPUUsage.push(oCPUUsage);
				graphNetwrokBW.push(oNetwrokBW);
			}

			Functions.Elements.MachineHealthGraph1 = new Y.Chart({
				dataProvider : graphCPUUsage,
				legend : {
					position : "right",
					styles : {
						hAlign : "center",
						item : {
							label : {
								paddingLeft : 4,
								paddingBottom : 1
							}
						}
					}
				},
				categoryKey : "Time",
				axes : {
					values : {
						title : "CPU Usage",
						type : "numeric",
						labelFormat : {
							suffix : "%"
						},
						alwaysShowZero : false
					}
				},
				horizontalGridlines : true,
				styles : {
					axes : {
						values : {
							label : {
								color : "#95C78C"
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						},
						Time : {
							label : {
								color : "#95C78C",
								display : 'none'
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						}
					}
				},
				render : Functions.Elements.MachineHealthGraphDiv1,
				tooltip : {
					styles : {
						textAlign : "left"
					},
					allowHTML : true,
					markerLabelFunction : function(categoryItem, valueItem,
							itemIndex, series, seriesIndex) {
						return Y.Node.create('<div><strong>ID:</strong>&nbsp;'
								+ valueItem.displayName + '<br /><strong>'
								+ valueItem.axis._titleTextField.textContent
								+ ':</strong>&nbsp;' + valueItem.value
								+ '%</div>')
					}
				},
				showMarkers : (stats.length < 10)
			});
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph1._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph1.getSeries(
						Functions.Elements.MachineHealthGraph1._seriesKeys[i])
						.set("styles", {
							line : {
								weight : (stats.length < 10) ? 3 : 1
							}
						});

			Functions.Elements.MachineHealthGraph2 = new Y.Chart({
				dataProvider : graphAvailMem,
				legend : {
					position : "right",
					styles : {
						hAlign : "center",
						item : {
							label : {
								paddingLeft : 4,
								paddingBottom : 1
							}
						}
					}
				},
				categoryKey : "Time",
				axes : {
					values : {
						title : "Available Memory",
						type : "numeric",
						labelFormat : {
							suffix : " MB"
						},
						alwaysShowZero : false
					}
				},
				horizontalGridlines : true,
				styles : {
					axes : {
						values : {
							label : {
								color : "#95C78C"
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						},
						Time : {
							label : {
								color : "#95C78C",
								display : 'none'
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						}
					}
				},
				render : Functions.Elements.MachineHealthGraphDiv2,
				tooltip : {
					styles : {
						textAlign : "left"
					},
					allowHTML : true,
					markerLabelFunction : function(categoryItem, valueItem,
							itemIndex, series, seriesIndex) {
						return Y.Node.create('<div><strong>ID:</strong>&nbsp;'
								+ valueItem.displayName + '<br /><strong>'
								+ valueItem.axis._titleTextField.textContent
								+ ':</strong>&nbsp;' + valueItem.value
								+ ' MB</div>')
					}
				},
				showMarkers : (stats.length < 10)
			});
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph2._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph2.getSeries(
						Functions.Elements.MachineHealthGraph2._seriesKeys[i])
						.set("styles", {
							line : {
								weight : (stats.length < 10) ? 3 : 1
							}
						});

			Functions.Elements.MachineHealthGraph3 = new Y.Chart({
				dataProvider : graphAvgDiskQLen,
				legend : {
					position : "right",
					styles : {
						hAlign : "center",
						item : {
							label : {
								paddingLeft : 4,
								paddingBottom : 1
							}
						}
					}
				},
				categoryKey : "Time",
				axes : {
					values : {
						title : "Disk Queue",
						alwaysShowZero : false
					}
				},
				horizontalGridlines : true,
				styles : {
					axes : {
						values : {
							label : {
								color : "#95C78C"
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						},
						Time : {
							label : {
								color : "#95C78C",
								display : 'none'
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						}
					}
				},
				render : Functions.Elements.MachineHealthGraphDiv3,
				tooltip : {
					styles : {
						textAlign : "left"
					},
					allowHTML : true,
					markerLabelFunction : function(categoryItem, valueItem,
							itemIndex, series, seriesIndex) {
						return Y.Node.create('<div><strong>ID:</strong>&nbsp;'
								+ valueItem.displayName + '<br /><strong>'
								+ valueItem.axis._titleTextField.textContent
								+ ':</strong>&nbsp;' + valueItem.value
								+ '</div>')
					}
				},
				showMarkers : (stats.length < 10)
			});
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph3._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph3.getSeries(
						Functions.Elements.MachineHealthGraph3._seriesKeys[i])
						.set("styles", {
							line : {
								weight : (stats.length < 10) ? 3 : 1
							}
						});

			Functions.Elements.MachineHealthGraph4 = new Y.Chart({
				dataProvider : graphNetwrokBW,
				legend : {
					position : "right",
					styles : {
						hAlign : "center",
						item : {
							label : {
								paddingLeft : 4,
								paddingBottom : 1
							}
						}
					}
				},
				categoryKey : "Time",
				axes : {
					values : {
						title : "Network Bandwidth",
						labelFormat : {
							suffix : " Mbps"
						},
						alwaysShowZero : false
					}
				},
				horizontalGridlines : true,
				styles : {
					axes : {
						values : {
							label : {
								color : "#95C78C"
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						},
						Time : {
							label : {
								color : "#95C78C",
								display : 'none'
							},
							title : {
								color : "#95C78C",
								fontSize : "100%"
							}
						}
					}
				},
				render : Functions.Elements.MachineHealthGraphDiv4,
				tooltip : {
					styles : {
						textAlign : "left"
					},
					allowHTML : true,
					markerLabelFunction : function(categoryItem, valueItem,
							itemIndex, series, seriesIndex) {
						return Y.Node.create('<div><strong>ID:</strong>&nbsp;'
								+ valueItem.displayName + '<br /><strong>'
								+ valueItem.axis._titleTextField.textContent
								+ ':</strong>&nbsp;' + valueItem.value
								+ '</div>')
					}
				},
				showMarkers : (stats.length < 10),
			});
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph4._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph4.getSeries(
						Functions.Elements.MachineHealthGraph4._seriesKeys[i])
						.set("styles", {
							line : {
								weight : (stats.length < 10) ? 3 : 1
							}
						});
			break;
		case 'Active Nodes':
			var active = Data.GetLast('ActiveNodeStatistics');
			// The Table
			Functions.Elements.ActiveNodeOpData = new Y.DataTable(
					{
						columns : [ {
							key : "IP",
							label : "IP"
						}, {
							key : "PortNumber",
							label : "Port"
						}, {
							key : "Role",
							label : "Role"
						}, {
							key : "CPU",
							label : "CPU %",
							formatter : Data.PercTwoFormatter
						}, {
							key : "AVGDISK",
							label : "Avg Disk Q Length"
						}, {
							key : "NetworkBW",
							label : "Network BW"
						}, {
							key : "Memory",
							label : "Memory"
						}, {
							key : "Export",
							label : "Export"
						}

						],
						data : active,
						autoSync : true,
						strings : {
							emptyMessage : "<div style='text-align:center'>No data available!</div>"
						}
					});
			Functions.Elements.ActiveNodeOpData.render(newDiv
					.one('#ActiveNodeOpData'));
			break;
		case 'Social Rating':
			var rating = Data.GetLast('RatingStatistics');
			// The Table
			Functions.Elements.SocialRatingOpData = new Y.DataTable(
					{
						columns : [ {
							key : "IP",
							label : "IP"
						}, {
							key : "PortNumber",
							label : "Port"
						}, {
							key : "Threads",
							label : "Threads"
						}, {
							key : "Status",
							label : "Status"
						}, {
							key : "SessionThroughput",
							label : "Session Throughput"
						}, {
							key : "ActionThroughput",
							label : "Action Throughput"
						}, {
							key : "Satisfying",
							label : "Satisfying %",
							formatter : Data.PercTwoFormatter
						}, {
							key : "Complete%",
							label : "%"
						}, {
							key : "Cancel",
							label : "Cancel"
						} ],
						data : active,
						autoSync : true,
						strings : {
							emptyMessage : "<div style='text-align:center'>No data available!</div>"
						}
					});
			Functions.Elements.SocialRatingOpData.render(newDiv
					.one('#SocialRatingOpData'));
			break;
		case 'Social Benchmark':
			var active = Data.GetLast('ActiveNodeStatistics');
			// The Table
			Functions.Elements.SocialBenchmarkOpData = new Y.DataTable(
					{
						columns : [ {
							key : "IP",
							label : "IP"
						}, {
							key : "PortNumber",
							label : "Port"
						}, {
							key : "Workload",
							label : "Workload"
						}, {
							key : "Status",
							label : "Status"
						}, {
							key : "Session Throughput",
							label : "Session Throughput"
						}, {
							key : "Action Throughput",
							label : "Action Throughput"
						}, {
							key : "Satisfying %",
							label : "Satisfying %"
						}, {
							key : "Status",
							label : "Status"
						}

						],
						data : active,
						autoSync : true,
						strings : {
							emptyMessage : "<div style='text-align:center'>No data available!</div>"
						}
					});
			Functions.Elements.SocialBenchmarkOpData.render(newDiv
					.one('#SocialBenchmarkOpData'));
			break;
		}

		// setTimeout(function() {
		Functions.Y.all('#daBody>div.Older').setStyle('display', 'none')
				.remove(true);
		// }, 200);
	},
	ReDrawSocialOpGraphs : function() {
		if (Functions.Elements.SocialOpSelect.get('value') != '') {
			for ( var i = 0; i < Functions.Elements.SocialOpGraph1._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph1.getSeries(
						Functions.Elements.SocialOpGraph1._seriesKeys[i]).set(
						"visible", false);
			Functions.Elements.SocialOpGraph1.getSeries(
					Functions.Elements.SocialOpSelect.get('value')).set(
					"visible", true);
			for ( var i = 0; i < Functions.Elements.SocialOpGraph2._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph2.getSeries(
						Functions.Elements.SocialOpGraph2._seriesKeys[i]).set(
						"visible", false);
			Functions.Elements.SocialOpGraph2.getSeries(
					Functions.Elements.SocialOpSelect.get('value')).set(
					"visible", true);
			for ( var i = 0; i < Functions.Elements.SocialOpGraph3._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph3.getSeries(
						Functions.Elements.SocialOpGraph3._seriesKeys[i]).set(
						"visible", false);
			Functions.Elements.SocialOpGraph3.getSeries(
					Functions.Elements.SocialOpSelect.get('value')).set(
					"visible", true);
		} else {
			for ( var i = 0; i < Functions.Elements.SocialOpGraph1._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph1.getSeries(
						Functions.Elements.SocialOpGraph1._seriesKeys[i]).set(
						"visible", true);
			for ( var i = 0; i < Functions.Elements.SocialOpGraph2._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph2.getSeries(
						Functions.Elements.SocialOpGraph2._seriesKeys[i]).set(
						"visible", true);
			for ( var i = 0; i < Functions.Elements.SocialOpGraph3._seriesKeys.length; i++)
				Functions.Elements.SocialOpGraph3.getSeries(
						Functions.Elements.SocialOpGraph3._seriesKeys[i]).set(
						"visible", true);
		}
	},

	ReDrawMachineHealthGraphs : function() {
		if (Functions.Elements.MachineHealthSelect.get('value') != '') {
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph1._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph1.getSeries(
						Functions.Elements.MachineHealthGraph1._seriesKeys[i])
						.set("visible", false);
			Functions.Elements.MachineHealthGraph1.getSeries(
					Functions.Elements.MachineHealthSelect.get('value')).set(
					"visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph2._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph2.getSeries(
						Functions.Elements.MachineHealthGraph2._seriesKeys[i])
						.set("visible", false);
			Functions.Elements.MachineHealthGraph2.getSeries(
					Functions.Elements.MachineHealthSelect.get('value')).set(
					"visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph3._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph3.getSeries(
						Functions.Elements.MachineHealthGraph3._seriesKeys[i])
						.set("visible", false);
			Functions.Elements.MachineHealthGraph3.getSeries(
					Functions.Elements.MachineHealthSelect.get('value')).set(
					"visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph4._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph4.getSeries(
						Functions.Elements.MachineHealthGraph4._seriesKeys[i])
						.set("visible", false);
			Functions.Elements.MachineHealthGraph4.getSeries(
					Functions.Elements.MachineHealthSelect.get('value')).set(
					"visible", true);
		} else {
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph1._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph1.getSeries(
						Functions.Elements.MachineHealthGraph1._seriesKeys[i])
						.set("visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph2._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph2.getSeries(
						Functions.Elements.MachineHealthGraph2._seriesKeys[i])
						.set("visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph3._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph3.getSeries(
						Functions.Elements.MachineHealthGraph3._seriesKeys[i])
						.set("visible", true);
			for ( var i = 0; i < Functions.Elements.MachineHealthGraph4._seriesKeys.length; i++)
				Functions.Elements.MachineHealthGraph4.getSeries(
						Functions.Elements.MachineHealthGraph4._seriesKeys[i])
						.set("visible", true);
		}
	},
	InitializeBodies : function() {
		Functions.Elements.MachineHealthSelect = Y.one('#MachineHealthSelect');
		Functions.Elements.MachineHealthSelect.on('change',
				Functions.ReDrawMachineHealthGraphs);
		Functions.Elements.MachineHealthGraphDiv1 = Y.Node
				.create('<div class="graph"></div>');
		Functions.Elements.MachineHealthGraphDiv2 = Y.Node
				.create('<div class="graph"></div>');
		Functions.Elements.MachineHealthGraphDiv3 = Y.Node
				.create('<div class="graph"></div>');
		Functions.Elements.MachineHealthGraphDiv4 = Y.Node
				.create('<div class="graph"></div>');
		Y.one("#MachineHealthGraphs").append(
				Functions.Elements.MachineHealthGraphDiv1).append(
				Functions.Elements.MachineHealthGraphDiv2).append(
				Functions.Elements.MachineHealthGraphDiv3).append(
				Functions.Elements.MachineHealthGraphDiv4);
		Functions.Elements.MachineHealthGraphDiv1.setStyle(
				'width',
				Math.floor(Number(Functions.Elements.MachineHealthGraphDiv1
						.getComputedStyle("width").replace(/\..*/, '').replace(
								/[^0-9]+/, '')) - 30)).setStyle("marginRight",
				30).setStyle("marginTop", 50);
		Functions.Elements.MachineHealthGraphDiv2.setStyle(
				'width',
				Math.floor(Number(Functions.Elements.MachineHealthGraphDiv2
						.getComputedStyle("width").replace(/\..*/, '').replace(
								/[^0-9]+/, '')) - 30)).setStyle("marginRight",
				30).setStyle("marginTop", 50);
		Functions.Elements.MachineHealthGraphDiv3.setStyle(
				'width',
				Math.floor(Number(Functions.Elements.MachineHealthGraphDiv3
						.getComputedStyle("width").replace(/\..*/, '').replace(
								/[^0-9]+/, '')) - 30)).setStyle("marginRight",
				30).setStyle("marginTop", 50);
		Functions.Elements.MachineHealthGraphDiv4.setStyle(
				'width',
				Math.floor(Number(Functions.Elements.MachineHealthGraphDiv4
						.getComputedStyle("width").replace(/\..*/, '').replace(
								/[^0-9]+/, '')) - 30)).setStyle("marginRight",
				30).setStyle("marginTop", 50);
	},
	HideBody : function() {
		Functions.Y.all("#daBody>div").setStyle('display', false);
	},
	GenerateLogo : function() {
		var logo_canvas = document.createElement('canvas'), ctx = logo_canvas
				.getContext('2d'), grd = ctx.createLinearGradient(0, 0, 0, 74);

		logo_canvas.width = 205;
		logo_canvas.height = 75;
		// Logo Line 1
		grd.addColorStop(.0000, "#e5e696");
		grd.addColorStop(.0757, "#e5e696");
		grd.addColorStop(.2005, "#dfe088");
		grd.addColorStop(.2005, "#d4d572");
		grd.addColorStop(.2649, "#cecf6f");
		grd.addColorStop(.3784, "#cecf6f");
		// Logo Line 2
		grd.addColorStop(.3784, "#e5e696");
		grd.addColorStop(.4541, "#e5e696");
		grd.addColorStop(.5789, "#dfe088");
		grd.addColorStop(.5789, "#d4d572");
		grd.addColorStop(.6432, "#cecf6f");
		grd.addColorStop(.7568, "#cecf6f");
		// Logo Line 3
		grd.addColorStop(.7568, "#e5e696");
		grd.addColorStop(.5084, "#e5e696");
		grd.addColorStop(.8857, "#dfe088");
		grd.addColorStop(.8857, "#d4d572");
		grd.addColorStop(.9270, "#cecf6f");
		grd.addColorStop(1.000, "#cecf6f");

		ctx.font = "36px HeliosCondBold";
		ctx.fillStyle = grd;
		ctx.fillText("BG", 0, 27);
		ctx.fillText("VISUALIZATION", 0, 55);
		ctx.font = "24px HeliosCondBold";
		ctx.fillText("DECK", 155, 74);

		logo_canvas.style.position = 'relative';
		logo_canvas.style.zIndex = 10;
		logo_canvas.style.fontFamily = 'HeliosCondBold';

		document.getElementById("daNav").insertBefore(logo_canvas,
				document.getElementById("daNav").firstChild);
		// Functions.Y.one("#daNav").prepend(logo_canvas);
	},
	FixULPosition : function() {
		var Y = Functions.Y, ul = Y.one("#daNav>ul"), mtop = Math.max(0, Math
				.floor((ul.get('docHeight') // Height of the page which is
				// practically height of daNav
				- 50 // 2 x 25 top and bot padding of daNav
				- 75 // Logo's height
				- 25 // Some space below Logo
				- ul.get('region').height // UL's height
				) / 2 // Devided by 2, half for top and half for bottom
				));
		if (mtop < 100)
			mtop += Math.floor((100 - mtop) * .5); // Beauty Buffer
		if (mtop > 180)
			mtop -= Math.floor((mtop - 180) * .5); // Beauty Buffer
		ul.setStyle('marginTop', mtop);
		Y.one("#topShadow").setStyle('height', ul.get('region').top);
		Y.one("#topRow").setStyle('height', ul.get('region').top);
		Y.one("#botShadow").setStyle('height', ul.get('docHeight')).setY(
				ul.getY() + ul.get('region').height);
	},
	BeautifyNav : function() {
		var Y = Functions.Y, ul = Y.one("#daNav>ul"), lis = ul.all("li"), max_li_width = ul
				.get('region').width;
		ul.setStyle('float', 'none').setStyle('width', '100%');
		lis.setStyle('padding', '20px '
				+ Math.floor((ul.get('region').width - max_li_width) / 2)
				+ 'px');

		Shadow.Generate(250, ul.get('docHeight'));
	},
	ActivateNav : function() {
		var lis = Functions.Y.all("#daNav>ul>li");
		lis.each(function(li) {
			li.append(Shadow.DuplicateRow());
			li.append(Shadow.DuplicateVertical(li.get('region').height));
			li.append(Shadow.DuplicateRow(true));
		}).on('click', function(e) {
			e.preventDefault();
			var li = e.target;
			if (li.get('tagName').toLowerCase() != 'li')
				li = li.ancestor('li');
			if (li.get('aria-disabled'))
				return;
			lis.removeClass('active');
			Functions.Activate(li.getAttribute('rel'));
		});
		Functions.Y.one("#daNav").setStyle('visibility', 'visible');
	},
	AttachShadows : function() {
		var Y = Functions.Y;
		Y.one("#topShadow").append(Shadow.DuplicateVertical());
		Y.one("#botShadow").append(Shadow.DuplicateVertical());
		Y.one("#topRow").append(Shadow.DuplicateRow());

		Y.on("windowresize", Functions.FixULPosition);
		Functions.FixULPosition();
	},
	GenerateTitle : function(rel) {
		var title = Functions.Y.one("#daTitle"), canvas = document
				.createElement('canvas'), ctx = canvas.getContext('2d'), grd = ctx
				.createLinearGradient(0, 0, 0, 20);

		title.get('childNodes').remove();

		canvas.width = title.get('docWidth') - 250;
		canvas.height = 20;

		grd.addColorStop(.00, "#e5e696");
		grd.addColorStop(.20, "#e5e696");
		grd.addColorStop(.53, "#dfe088");
		grd.addColorStop(.53, "#d4d572");
		grd.addColorStop(.70, "#cecf6f");
		grd.addColorStop(1.0, "#cecf6f");

		ctx.font = "28px HeliosCondBold";
		ctx.fillStyle = grd;
		ctx.fillText(rel.toUpperCase(), 0, 20);

		title.prepend(canvas);
	},
	LoadData : function() {
		Functions.Y.on('io:success', Data.Add, Data);
		Functions.Y.on('io:failure', Data.Error, Data);
		this.LoadDataLoop();
		setInterval(Functions.LoadDataLoop, Functions.LoopInterval);
	},
	LoadDataLoop : function() {
		console.log("Load Data");
		if (Data.LoadTimestamp == 0)
			Functions.LoadDataOnce();
		Data.Load('files/CurrentStats.txt', {
			array : true
		});
		Data.Load('files/Results.txt', {
			normalize : true
		});
	},
	LoadDataOnce : function() {
		Data.Load('files/BGClientStats.txt');
	},
	PopulateTimestamp : 0,
	FirstRun : function() {
		var rel = Function.Y ? Function.Y.one('#daNav>ul>li.active[rel]')
				.getAttribute("rel") : "";
		if (rel == "")
			Functions.Activate("Social Op Rating");
	}
}, Shadow = {
	Vertical : {
		height : 0,
		width : 0,
		canvas : null
	},
	GenerateVertical : function(width, height) {
		var c = document.createElement('canvas');
		c.width = width;
		c.height = height;
		ctx = c.getContext('2d');
		grd = ctx.createLinearGradient(0, 0, c.width, 0);
		grd.addColorStop(0, "rgba(56, 36, 60, .3)");
		grd.addColorStop(.93, "rgba(56, 36, 60, .5)");
		grd.addColorStop(1, "rgba(56, 36, 60, .8)");
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, c.width, c.height);
		this.Vertical.canvas = c;
		this.Vertical.height = c.height;
		this.Vertical.width = c.width;
	},
	Row : {
		height : 0,
		width : 0,
		canvas : null
	},
	GenerateRow : function(width) {
		var c = document.createElement('canvas');
		c.width = width;
		c.height = 20;
		ctx = c.getContext('2d');
		ctx.rotate(-.01);
		ctx.translate(0, 5);
		grd = ctx.createLinearGradient(0, 0, 0, c.height);
		grd.addColorStop(0, "rgba(56, 36, 60, 0)");
		grd.addColorStop(.5, "rgba(56, 36, 60, .3)");
		grd.addColorStop(1, "rgba(56, 36, 60, .8)");
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, c.width, c.height);
		this.Row.canvas = c;
		this.Row.height = c.height;
		this.Row.width = c.width;
		c.className = 'rowShadow';
	},
	DuplicateVertical : function(height) {
		var c = document.createElement('canvas'), ctx = c.getContext('2d');
		c.width = this.Vertical.width;
		if (height == null)
			c.height = this.Vertical.height;
		else {
			c.height = height;
			c.className = 'sideShadow';
		}
		ctx.drawImage(this.Vertical.canvas, 0, 0);
		return c;
	},
	DuplicateRow : function(inverse) {
		var c = document.createElement('canvas'), ctx = c.getContext('2d');
		c.width = this.Row.width;
		c.height = this.Row.height;
		if (inverse === true) {
			ctx.rotate(Math.PI);
			ctx.translate(-1 * c.width, -1 * c.height);
		}
		ctx.drawImage(this.Row.canvas, 0, 0);
		c.className = (inverse === true) ? 'invShadow' : 'rowShadow';
		return c;
	},
	Generate : function(width, height) {
		this.GenerateVertical(width, height);
		this.GenerateRow(width);
	}
}, Data = {
	Add : function(id, o, arg) {
		var json = {}, Y = Functions.Y;
		arg = arg || {};
		if (arg.normalize) {
			var lines = o.responseText.split(/(\r|\n)+/);
			for ( var i = 0; i < lines.length; i++) {
				if (Y.Lang.trim(lines[i]) == '')
					continue;
				try {
					var line = Y.JSON.parse(lines[i]);
					for ( var j in line)
						if (line.hasOwnProperty(j)) {
							if (typeof (json[j]) == 'undefined')
								json[j] = [];
							json[j].push(line[j]);
						}
				} catch (e) {
				}
				;
			}
		} else if (Y.Lang.trim(o.responseText) != '') {
			try {
				json = Y.JSON.parse(o.responseText);
			} catch (e) {
			}
			;
		}
		if (json) {
			var changed = false;
			if (arg.array) {
				for ( var i in json)
					if (json.hasOwnProperty(i)) {
						if (typeof (Data.get[i]) == 'undefined')
							Data.get[i] = [];
						if (Data.get[i].length == 0
								|| !Data.get[i][Data.get[i].length - 1]
										.equals(json[i])) {
							Data.get[i].push(json[i]);
							changed = true;
						}
					}
			} else {
				for ( var i in json)
					if (json.hasOwnProperty(i)
							&& !(Data.get[i] && Data.get[i].equals(json[i]))) {
						Data.get[i] = json[i];
						changed = true;
					}
			}
			if (changed)
				Data.LoadTimestamp = new Date().getTime();
		}
		if (--Data._connections <= 0) {
			Data._connections = 0;
			// setTimeout(Functions.PopulateData, 200);
		}
	},
	Error : function(id, o, arg) {
		if (--Data._connections <= 0) {
			Data._connections = 0;
			// setTimeout(Functions.PopulateData, 200);
		}
	},
	LoadTimestamp : 0,
	_connections : 0,
	_firstrun : false,
	get : {},
	Get : function(arr, o) {
		if (typeof (arr) == 'string')
			arr = arr.split('.');
		var name = arr.shift();
		if (o == null)
			o = Data.get;
		if (arr.length > 0)
			return Data.Get(arr, o[name]);
		else
			return o[name];
	},
	GetLast : function(arr) {
		var a = Data.Get(arr);
		console.log(typeof (a));
		if (typeof (a) == 'object' && typeof (a.pop) == 'function')
			return a[a.length - 1];
		else
			return a;
	},
	PercTwoFormatter : function(o) {
		o.value *= 100;
		if (o.value >= 100)
			return '100.0%';
		return Functions.Y.DataType.Number.format(o.value, {
			suffix : '%',
			decimalPlaces : 2,
			decimalSeparator : '.'
		});
	},
	Load : function(url, arg) {
		// once all files loaded then call populate data (line 433+406)
		this._connections++;
		Functions.Y.io(url + '?' + Math.random(), {
			arguments : arg
		});
	}

};

YUI({
	base : "./js/",
	filter : "RAW"
}).use('node', 'event-base', 'event-resize', 'datatable', 'io', 'json-parse',
		'datatype-number', 'selector-css3', 'charts-legend', function(Y) {
			Functions.Y = Y;
			Y.on('load', function() {
				Functions.HideBody();
				Functions.LoadData();
				Functions.GenerateLogo();
				Functions.BeautifyNav();
				Functions.ActivateNav();
				Functions.AttachShadows();
				// Functions.BeautifyKeyValues();
				// Functions.InitializeBodies();
				Functions.FirstRun();
			});
		});

function populate() {
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// do your stuff!
	} else {
		alert('The File APIs are not fully supported by your browser.');
	}

}

function addParams() {
	var table = document.getElementById('ParamTable');
	if (table.style.visibility == 'hidden') {
		table.style.visibility = 'visible';
	}
	var rowCount = table.rows.length;
	var key1 = document.getElementById('key');
	var val1 = document.getElementById('val');
	// alert(key1.value);
	// alert(val1.value);

	var x = document.getElementById('ParamTable').insertRow(rowCount);
	var y = x.insertCell(0);
	var z = x.insertCell(1);
	var w = x.insertCell(2);
	y.innerHTML = "<input type='text' name='NameField' value='" + key1.value
			+ "' style='height:15px;border:1px'>";
	z.innerHTML = "<input type='text' name='valueField' value='" + val1.value
			+ "' style='width:320px; height:15px;border:1px'>";
	w.innerHTML = "<input type='image' name='Remove' src='x-wrong-cross-no-md.png' style='width:15px; height:15px; border:1px' onclick='remParams(this)'/>";
	document.getElementById('key').value = "";
	document.getElementById('val').value = "";

}

function remParams(r) {

	var i = r.parentNode.parentNode.rowIndex;
	document.getElementById('ParamTable').deleteRow(i);
	if (i == 2) {
		document.getElementById('ParamTable').style.visibility = 'hidden';
	}
}

function addNode() {
	var table = document.getElementById('bgTable');

	if (table.style.visibility == 'hidden') {
		table.style.visibility = 'visible';
	}
	var rowCount = table.rows.length;

	var key1 = document.getElementById('BGListIP');
	var val1 = document.getElementById('BGLIstPt');

	var x = document.getElementById('bgTable').insertRow(rowCount);
	var y = x.insertCell(0);
	var z = x.insertCell(1);
	var w = x.insertCell(2);
	y.innerHTML = "<input type='text' name='BGNameField' value='" + key1.value
			+ "' style='height:15px;border:1px'>";
	z.innerHTML = "<input type='text' name='BGvalueField' value='" + val1.value
			+ "' style='width:320px; height:15px;border:1px'>";
	w.innerHTML = "<input type='image' name='RemoveBGVal' src='x-wrong-cross-no-md.png' style='width:15px; height:15px; border:1px' onclick='remNode(this)'/>";
	document.getElementById('BGListIP').value = "";
	document.getElementById('BGLIstPt').value = "";

}

function remNode(r) {
	var i = r.parentNode.parentNode.rowIndex;
	document.getElementById('bgTable').deleteRow(i);
	if (i == 2) {
		document.getElementById('bgTable').style.visibility = 'hidden';
	}
}

function replaceVal() {

	var table = document.getElementById('ParamTable');
	var key1 = document.getElementById('key');
	var val1 = document.getElementById('val');
	var replaced = 0;

	for ( var i = 2, row; row = table.rows[i]; i++) {

		if (row.cells[0].firstChild.value == key1.value) {

			row.cells[1].firstChild.value = val1.value;
			replaced = 1;
		}

	}
	if (replaced == 1) {
		alert('You have successfully replaced ' + key1.value + ' parameter');
	} else {
		alert('Sorry, no such parameter has been added yet');
	}
	document.getElementById('key').value = "";
	document.getElementById('val').value = "";
}

function selectChanged(newvalue) {
	// alert("you chose: " + newvalue);
	// document.getElementById('WorkloadParameterValue').value='job done';
	document.getElementById("WorkloadParameterValue").value = 'job done';
	// alert(document.getElementById('WorkloadParameterValue').value);
}

function AddToList() {
	var table = document.getElementById('WorkloadParamTable');
	var rowCount = table.rows.length;
	// var key1 = document.getElementById('key');
	var key1 = document.getElementById('BGListIP');
	var val1 = document.getElementById('BGLIstPt');
	// alert(key1.value);
	// alert(val1.value);

	var x = document.getElementById('WorkloadParamTable').insertRow(rowCount);
	var y = x.insertCell(0);
	var z = x.insertCell(1);
	var w = x.insertCell(2);
	y.innerHTML = "<input type='text' name='WrkLoadParam' value='" + key1.value
			+ "' style='height:15px;border:1px'>";
	z.innerHTML = "<input type='text' name='WrkLoadParamVal' value='"
			+ val1.value + "' style='width:320px; height:15px;border:1px'>";
	w.innerHTML = "<input type='image' name='RemoveWrkloadParam' src='x-wrong-cross-no-md.png' style='width:15px; height:15px; border:1px' onclick='remWrkloadParam(this)'/>";

}

function remWrkloadParam(r) {
	var i = r.parentNode.parentNode.rowIndex;
	document.getElementById('WorkloadParamTable').deleteRow(i);
}

function readFile(files) {
	alert('reading a file');
	var fileContent;
	var file = files[0];
	// if(file.type.indexOf("text") == 0){
	var reader = new FileReader();
	reader.onloadend = function(evt) {
		if (evt.target.readyState == FileReader.DONE) { // DONE == 2
			fileContent = evt.target.result;

			var newArray = fileContent.split('\n');
			for (i = 3; i < newArray.length; i++) {

				var lineArray = newArray[i].split('=');
				var prop = lineArray[0];
				switch (prop) {
				case 'usercount':
					document.getElementById('UsrCntDS').value = "";
					document.getElementById('UsrCntDS').value = lineArray[1];
					break;

				case 'resourcecountperuser':
					document.getElementById('ResCntDS').value = "";
					document.getElementById('ResCntDS').value = lineArray[1];
					break;

				case 'friendcountperuser':
					document.getElementById('FrndCntDS').value = "";
					document.getElementById('FrndCntDS').value = lineArray[1];
					break;

				case 'confperc':
					document.getElementById('per_Confirmed_Friends').value = "";
					document.getElementById('per_Confirmed_Friends').value = lineArray[1];
					break;

				case 'requestdistribution':
					document.getElementById('reqDistDW').value = "";
					document.getElementById('reqDistDW').value = lineArray[1];
					break;

				case 'requestmean':
					document.getElementById('requestmean').value = "";
					document.getElementById('requestmean').value = lineArray[1];
					break;

				default:
					break;

				}

			}

		}
	};
	reader.readAsBinaryString(file);

}

function saveFile() {
	var fileName = document.getElementById('FilePath').value;
	var prop = 'filhaal itna';
	if (!fileName) {
		alert('Please enter a filename');
	} else {
		var bb = new BlobBuilder();
		bb.append(prop);
		var filesaver = saveAs(bb.getBlob("text/plain;charset=utf-8"), fileName
				+ ".txt");
		filesaver.onwriteend = function() {

			alert('You have saved your file successfully!');

		}
	}
}

function validateProps() {
	var userCount = 0;
	var frns = 0;
	var Res = 0;
	var ImgSize = 0;
	var ReqMean = 0;
	var ThCount = 0;
	var confper = 0;
	var FilePath = 0;
	var inputToServer = "";
	var flag = false;

	var numbers = /^[0-9]+$/;

	var invalidInput = "";

	var isValid = validateClientClass();
	if (isValid == 1) {

		userCount = document.getElementById('UsrCntDS').value;
		frns = document.getElementById('FrndCntDS').value;
		Res = document.getElementById('ResCntDS').value;
		ImgSize = document.getElementById('ImgSize').value;
		ReqMean = document.getElementById('requestmean').value;
		ThCount = document.getElementById('threadcount').value;
		confper = document.getElementById('per_Confirmed_Friends').value;
		FilePath = document.getElementById('FilePath').value;
		var reqDistribution = document.getElementById("reqDistDW");
		var reqDistributionValue = reqDistribution.options[reqDistribution.selectedIndex].value;

		if (!userCount.match(numbers)) {
			invalidInput = "User Count ";
			flag = true;
		}
		if (!frns.match(numbers)) {
			invalidInput = invalidInput + "Friends Count ";
			flag = true;
		}

		if (!Res.match(numbers)) {
			invalidInput = invalidInput + "Resource Count ";
			flag = true;
		}

		if (!ThCount.match(numbers)) {
			invalidInput = invalidInput + "Thread Count ";
			flag = true;
		}

		if (!ImgSize.match(numbers)) {
			invalidInput = invalidInput + "Image Size ";
			flag = true;
		}
		if (confper > 100 || confper < 0 || !confper.match(numbers)) {

			alert('Please enter a value for confirmed friends from 0 to 100');
			return false;

		}
		if (ReqMean < 0 || ReqMean > 1) {
			alert('Please enter a value for Request mean from 0 to 1');
			return false;
		}

		if (flag == true) {
			alert('Please check following fields for numeric value: '
					+ invalidInput);
			return false;
		} else {

			inputToServer = "usercount" + "=" + userCount + ";"
					+ "friendcountperuser" + "=" + frns + ";"
					+ "resourcecountperuser" + "=" + Res + ";" + "ImgSize"
					+ "=" + ImgSize + ";" + "requestmean" + "=" + ReqMean + ";"
					+ "threadcount" + "=" + ThCount + ";" + "confperc" + "="
					+ confper + ";" + "requestdistribution" + "="
					+ reqDistributionValue + ";";

			var table = document.getElementById('ParamTable');
			var tableList = "";
			var flag = false;

			for ( var i = 2, row; row = table.rows[i]; i++) {
				flag = true;
				tableList = tableList + row.cells[0].firstChild.value + "="
						+ row.cells[1].firstChild.value + ";";
			}

			if (flag == true) {
				inputToServer = inputToServer + "&testDataStore=";
				inputToServer = inputToServer + tableList;
			}

			var flag = false;
			var client = document.getElementById('clientval').value;
			var buttonClick = "Button=populateDataStoreButton&";
			var sendData = buttonClick + "DataStoreParam=";
			sendData = sendData + inputToServer;
			sendData = sendData + "&";
			sendData = sendData + "clientval=";
			sendData = sendData + client;

			var req;
			if (window.XMLHttpRequest) {
				req = new XMLHttpRequest();
			} else {
				req = new ActiveXObject("Microsoft.XMLHTTP");
			}
			progWindow = window
					.open(
							'',
							'',
							'width=500,height=500,scrollbars=yes,resizable=yes,left=400,top=400,screenX=400,screenY=400');
			progWindow.document.write("<p>Populating Data....please wait</p>");
			progWindow.focus();
			req.onreadystatechange = function() {
				if (req.readyState == 4) {
					if (req.status == 200) {
						progWindow.document.write("<p>" + req.responseText
								+ "</p>");

					} else {
						alert("An error has occured making the request");
					}
				}
			};

			// var parameters=inputToServ;
			req.open("POST", "TestingServlet", true);
			req.setRequestHeader("Content-type",
					"application/x-www-form-urlencoded");
			req.send(sendData);

		}

	}
}
function validateClientClass() {
	if (document.getElementById('clientval').value == "") {
		alert("Please enter Client class before proceeding.");
		return 0;
	} else {
		return 1;
	}
}

function test() {

	var isValid = validateClientClass();
	if (isValid == 1) {

		var table = document.getElementById('ParamTable');
		var tableList = "";
		var flag = false;
		var buttonClick = "Button=testDataStoreButton&";
		var inputToServer = buttonClick + "clientval=";
		// Pass client
		var client = document.getElementById('clientval').value;
		inputToServer = inputToServer + client;

		for ( var i = 2, row; row = table.rows[i]; i++) {
			flag = true;
			tableList = tableList + row.cells[0].firstChild.value + "="
					+ row.cells[1].firstChild.value + ";";
		}

		if (flag == true) {
			inputToServer = inputToServer + "&testDataStore=";
			inputToServer = inputToServer + tableList;
		}

		// document.getElementById("hiddentxt").value = inputToServ;
		var parameters = inputToServer;

		var req;
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
		} else {
			req = new ActiveXObject("Microsoft.XMLHTTP");
		}

		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				if (req.status == 200) {

					if (req.responseText == "OK") {
						if (confirm('Connection Successful. Do you wish to Create Schema?')) {
							createSchema();
						}
					} else {
						alert("Connection to DataStore Failed !! Please Try again");
					}
				} else {
					alert("An error has occured making the request");
				}
			}
		};

		// var parameters=inputToServ;
		req.open("POST", "TestingServlet", true);
		req.setRequestHeader("Content-type",
				"application/x-www-form-urlencoded");
		req.send(parameters);
	}

}

function createSchema() {

	var isValid = validateClientClass();
	if (isValid == 1) {

		var table = document.getElementById('ParamTable');
		var tableList = "";
		var flag = false;
		var buttonClick = "Button=CreateSchemaButton&";
		var inputToServer = buttonClick + "clientval=";
		// Pass client
		var client = document.getElementById('clientval').value;
		inputToServer = inputToServer + client;

		for ( var i = 2, row; row = table.rows[i]; i++) {
			flag = true;
			tableList = tableList + row.cells[0].firstChild.value + "="
					+ row.cells[1].firstChild.value + ";";
		}

		if (flag == true) {
			inputToServer = inputToServer + "&testDataStore=";
			inputToServer = inputToServer + tableList;
		}

		// document.getElementById("hiddentxt").value = inputToServ;
		var parameters = inputToServer;

		var req;
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
		} else {
			req = new ActiveXObject("Microsoft.XMLHTTP");
		}

		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				if (req.status == 200) {

					if (req.responseText == "OK") {
						alert("Schema Creation Successfull !!");

					} else {
						alert("Failure in Schema Creation !!");
					}

					document.getElementById("optDiv").innerHTML = req.responseText;
				} else {
					alert("An error has occured making the request");
				}
			}
		};

		// var parameters=inputToServ;
		req.open("POST", "TestingServlet", true);
		req.setRequestHeader("Content-type",
				"application/x-www-form-urlencoded");
		req.send(parameters);
	}

}

/* queryDataStore: Gets the current state of the database Madhu#110712 */
function queryDataStore() {
	var isValid = validateClientClass();
	if (isValid == 1) {
		var buttonClick = "Button=queryDataStore&";
		var inputToServer = buttonClick + "clientval=";
		// Pass client
		var client = document.getElementById('clientval').value;
		inputToServer = inputToServer + client;
		var table = document.getElementById('ParamTable');
		var tableList = "";
		
		for ( var i = 2, row; row = table.rows[i]; i++) {
			flag = true;
			tableList = tableList + row.cells[0].firstChild.value + "="
					+ row.cells[1].firstChild.value + ";";
		}

		if (flag == true) {
			inputToServer = inputToServer + "&testDataStore=";
			inputToServer = inputToServer + tableList;
		}		
		
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
		} else {
			req = new ActiveXObject("Microsoft.XMLHTTP");
		}

		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				if (req.status == 200) {

					var temp = req.responseText;
					var interSet = new Array();
					interSet = temp.split("{");

					var valSet = new Array();
					valSet = interSet[1].split("}");

					var keyValPairs = new Array();
					keyValPairs = valSet[0].split("]");

					var userCount = 0;
					var confFrns = 0;
					var pendFrns = 0;
					var ResCount = 0;
					var commCount = 0;

					var i = 0;
					for (i = 0; i < keyValPairs.length; i++) {

						var keyVal = new Array();
						keyVal = keyValPairs[i].split(",");
						key = keyVal[0].replace("[", "");

						switch (key) {

						case 'usercount':
							userCount = keyVal[1];
							break;

						case 'resourcesperuser':
							ResCount = keyVal[1];
							break;

						case 'avgpendingperuser':
							pendFrns = keyVal[1];
							break;

						case 'avgfriendsperuser':
							confFrns = keyVal[1];
							break;

						case 'commentsPerUser':
							commCount = keyVal[1];
							break;

						default:
							break;

						}

					}

					document.getElementById('UsrCntStat').value = userCount;
					document.getElementById('FrndCntStat').value = confFrns;
					document.getElementById('PendFrndCntStat').value = pendFrns;

					document.getElementById('ResCntStat').value = ResCount;

					document.getElementById('CommCntStat').value = commCount;

					if (userCount == 0 && confFrns == 0 && pendFrns == 0
							&& ResCount == 0 && commCount == 0) {

						alert('The Data Store is currently empty');
					}
				} else {
					alert("An error has occured making the request");
				}

			}
		};

		// var parameters=inputToServ;
		req.open("POST", "TestingServlet", true);
		req.setRequestHeader("Content-type",
				"application/x-www-form-urlencoded");
		req.send(inputToServer);
	}
}

function validateIPPort() {

	var ip = document.getElementById('BGListIP').value;
	ipParts = ip.split(".");
	if (ipParts.length == 4) {
		for (i = 0; i < 4; i++) {

			TheNum = parseInt(ipParts[i]);
			if (TheNum >= 0 && TheNum <= 255) {

			} else {
				break;
			}

		}
		if (i == 4)
			ValidIP = true;
		else
			alert('Invalid IP');
	}

	var port = document.getElementById('BGLIstPt').value;

	if (!port.isNumeric() || !(port > 0 && port < 65535)) {
		alert('Please enter a valid port number');
	}

}

function clearAll() {

	document.getElementById('key').value = "";
	document.getElementById('val').value = "";
	document.getElementById('clientval').value = "";
	document.getElementById('UsrCntStat').value = "";
	document.getElementById('FrndCntStat').value = "";
	document.getElementById('PendFrndCntStat').value = "";

	document.getElementById('ResCntStat').value = "";

	document.getElementById('CommCntStat').value = "";

	document.getElementById('BGListIP').value = "";
	document.getElementById('BGLIstPt').value = "";

	document.getElementById('input').value = "";

}