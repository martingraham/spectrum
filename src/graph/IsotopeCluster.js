IsotopeCluster = function(index, graph) {
	var p = index;
	var peak = graph.points[index];
	var delta = 1/peak.charge;
	this.points = Array();
	this.pep = graph.points[p].fragments[0].peptide;

	this.points.push(graph.points[p]);
	graph.points[p].IsotopeCluster = this;
	for (var i = 1; i < 10; i++){
		var pi = (p - i < 0  ? 0 : p - i); //make sure pi doesn't get negative


		//var fragment_mass = this.points[pi].x.toFixed(2)*1;
		//var isotope_mass_ll = (peak.x + delta*i).toFixed(2)*1 - 0.01;
		//var isotope_mass_ul = (peak.x + delta*i).toFixed(2)*1 + 0.01;
		//if ( isotope_mass_ll <= fragment_mass <= isotope_mass_ul){

		var actual_mass = graph.points[pi].x.toFixed(1);
		var calc_mass = (peak.x + delta*i).toFixed(1);
		if (actual_mass == calc_mass){
			if (graph.points[pi].fragments.length > 0)	//if peak is a new fragment break -> overlapping or false cluster id
				break;
			graph.points[pi].IsotopeCluster = this;
			this.points.push(graph.points[pi]);
			if(this.pep === graph.pep1)
				graph.points[pi].colour = graph.model.p1color_cluster;
			if(this.pep === graph.pep2)
				graph.points[pi].colour = graph.model.p2color_cluster;
		}
		else
			break;
	}

}