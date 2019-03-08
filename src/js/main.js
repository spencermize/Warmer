import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';

var map,L,layer,min,max;
$(async function(){
	TinyDatePicker('input.date',{
		min: '1/1/1700'
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
	L = await import('leaflet');
	await import('../../node_modules/leaflet-providers/leaflet-providers.js');
	map = L.map('map',{
		center: [0,0],
		zoom: 2,
		attributionControl: false
	});
	L.control.scale().addTo(map);
	L.tileLayer.provider('CartoDB.Positron').addTo(map);
}
async function loadMap(date){
	loading(true);
	const grid2geojson = await import('grid2geojson');
	const gradient = tinygradient(['rgb(0,255,0','rgb(255,0,0)']);

	if (layer){
		map.removeLayer(layer);
	}

	$.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
		const geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);

		const diff = max + Math.abs(min);
		var geoMod = _.filter(geo,function(o){
			return o.properties.value;
		});

		layer = L.geoJSON(geoMod,{
			style: function(feature){
				const percent = (Math.abs(min) + feature.properties.value) / diff;
				return {
					fillColor: gradient.rgbAt(percent),
					stroke: false,
					fillpacity: 0.85
				};
			}
		});
		layer.addTo(map);
		loading(false);
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
