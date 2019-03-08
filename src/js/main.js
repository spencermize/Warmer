import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';
import grid2geojson from 'grid2geojson';
import L from 'leaflet';
import '../../node_modules/leaflet-providers/leaflet-providers.js';
import 'leaflet.vectorgrid';
import './leafletExport.js';

var map,layer,min,max;
$(async function(){
	TinyDatePicker('input.date',{
		min: '1/1/1750',
		max: '11/30/2018'
	}).on('select',async function(_,dp){
		var d = new Date(dp.state.selectedDate);
		d = `${d.getFullYear()}/${d.getMonth() + 1}`;
		$('input.date').val(d);
		d = await $.getJSON(`/api/netcdf/time/${d}`);
		if (d >= 0){
			loadMap(d);
		} else {
			err('Sorry, date was out of range.');
		}
	});
	initMap();
	max = await $.getJSON('/api/netcdf/temperature/max');
	min = await $.getJSON('/api/netcdf/temperature/min');
});

async function initMap(){
	map = L.map('map',{
		center: [20,0],
		zoom: 2.5,
		minZoom: 2.5,
		zoomSnap: 0.25,
		attributionControl: false
	});
	L.control.scale().addTo(map);
	L.tileLayer.provider('CartoDB.Positron').addTo(map);

	map.on('layeradd',function(){
		loading(false);
	});
}
async function loadMap(date){
	loading(true);
	const gradient = tinygradient(['rgb(0,255,0','rgb(255,0,0)']);

	if (layer){
		map.removeLayer(layer);
	}

	$.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
		var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);
		const diff = max + Math.abs(min);

		geo.features = _.filter(geo.features,function(o){
			return o.properties.value;
		});

		layer = L.vectorGrid.slicer(geo,{
			rendererFactory: L.canvas.tile,
			vectorTileLayerStyles: {
				sliced: function(feature){
					const percent = (Math.abs(min) + feature.value) / diff;
					var col = gradient.rgbAt(percent).toHexString();
					return {
						fillColor: col,
						fill: true,
						stroke: true,
						color: col,
						fillOpacity: 0.5,
						weight: 0
					};
				}
			}
		});
		layer.addTo(map);
	});
}

$('a.download').on('click',function(e){
	e.preventDefault();
	download();
});
function download(){
	var downloadOptions = {
		container: map._container,
		exclude: ['.leaflet-control-zoom','.leaflet-control-attribution'],
		format: 'image/png',
		fileName: 'Map.png'
	};
	var promise = map.downloadExport(downloadOptions);
	promise.then(function(result){
		return result;
	});
}
function loading(yes = true){
	$('body').toggleClass('loading',yes);
}

function err(msg){
	var al = $('.alert');
	al.find('.text').text(msg);
	al.addClass('show');
	setTimeout(function(){
		al.removeClass('show');
	},3000);
}
