import '../scss/main.scss'

var L,grid2geojson;
$(async function(){
	L = await import('leaflet');
	grid2geojson = await import('grid2geojson');
	await import('../../node_modules/leaflet-providers/leaflet-providers.js');
	var map = L.map('map', {
		center: [51.505, -0.09],
		zoom: 13
	});
	L.tileLayer.provider('CartoDB.Positron').addTo(map);
	$.getJSON('/api/netcdf/temperature/0/geojson',function(data){
		const geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);
		L.geoJSON(geo).addTo(map);
	});
	
});