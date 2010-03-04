/////////////////////////////////////////////
//////////// Class repository ///////////////
/////////////////////////////////////////////


/* To Do

* Primero display branches (botones?). Al seleccionar Branch, pedir commits (en servidor) (por default hace la master)

Por ahora lo mejor será hacerlo por fecha. Currar algoritmo que recorre el árbol, compara las fechas y devuelve los datos del commit, ordenados de más reciente a más antiguo (10). Pensarlo para N. Luego habrá que ver el tema de las branches y merges

* Convertir la lista de commits en botones y que tengan un texto mas representativo.

* Al pinchar en cada commit, mostramos en el recuadro de la derecha la información del commit y enviamos el id del árbol al gadget de árbol.

*/


var repository = function() {
	/* Call to the parent constructor */
	EzWebGadget.call(this, {translatable: false});
}

repository.prototype = new EzWebGadget(); /* Extend from EzWebGadget */
repository.prototype.resourcesURL = "http://localhost/gadgets/repository-commits/";

/******************** OVERWRITE METHODS **************************/
repository.prototype.init = function() {

	// Initialize EzWeb variables

	this.path = "";								// Path to repository on remote machine
	this.url = "";								// URL to REST API
	this.is_configured = false;						// True if Path and URL are set, false otherwise

	this.lista_commits = [];						// Lista de commits a mostrar
	this.branches = []; 		// Branches del repositorio
	this.active_branch = [];

	this.page = 0;			// Página actual del repositorio (de 10 en 10)
	this.pagant_enabled = false;
	this.pagsig_enabled = true;

	this.first_load = true;		// Primera carga del gadget
	
	this.select_branch;		// Selec Branch


	this.eventPath = EzWebAPI.createRWGadgetVariable("eventPath");		// Send "path" to other gadgets
	this.eventUrl = EzWebAPI.createRWGadgetVariable("eventUrl");		// Send "URL" to other gadgets
	this.eventTree = EzWebAPI.createRWGadgetVariable("eventTree");		// Send a commit's tree SHA1 key to other gadgets.

	this.saved_path = EzWebAPI.createRWGadgetVariable("saved_path");	// Saved property Path
	this.saved_url = EzWebAPI.createRWGadgetVariable("saved_url");		// Saved property URL

	// CONSTANTS. Webpage alternatives (different views)

	this.MAIN_ALTERNATIVE       = 0;
	this.CONFIG_ALTERNATIVE     = 1;

	// User Interface

	this.alternatives = new StyledElements.StyledAlternatives({defaultEffect:"None"});
	this.leftcontent = "";							// HPaned Left content
	this.rightcontent = "";							// HPaned Right content

	// Initialize Main Alternative (view) and instantiate the HPaned object

	this.hpaned = new StyledElements.StyledHPaned({handlerPosition: 50, leftMinWidth: 20, rightMinWidth: 20});
	var mainAlternative = this.alternatives.createAlternative();
	mainAlternative.appendChild(this.hpaned);
  
    	this.restore();				// Load Saved configuration
	this._createUserInterface();		// Create User Interface
	this.reload();				// Reload Gadget
}


repository.prototype._createUserInterface = function() {

	var body = document.getElementsByTagName("body")[0];

	// Header Wrapper

	var header = document.createElement("div");
	header.id = "header";
	body.appendChild(header);

	// Header left (Alternative Switcher)

	var header_left = document.createElement("div");
	header_left.id = "header_left";
	header.appendChild(header_left);
	
	header_left.appendChild(this._createHeaderButton("images/view.png", "View Repository", EzWebExt.bind(function() { 
		this.alternatives.showAlternative(this.MAIN_ALTERNATIVE);
		this.reload();
	}, this)));
	header_left.appendChild(this._createHeaderButton("images/config.png", "Settings", EzWebExt.bind(function() { 
		this.alternatives.showAlternative(this.CONFIG_ALTERNATIVE);
		this.repaint();
	}, this)));

	// Header right (Branches selector)

	var header_right = document.createElement("div");
	header_right.id = "header_right";
	header.appendChild(header_right);

//	header_right.innerHTML = "Select Repository Branch: ";



// Temita branches

	var select_wrapper = document.createElement("div");
	select_wrapper.id = "select_wrapper";
	header_right.appendChild(select_wrapper);

//

	// Body wrapper

	var content = document.createElement("div");
	content.id = "content";
	body.appendChild(content);
	
	// CONFIGURATION ALTERNAVITE

	var configAlternative = this.alternatives.createAlternative();
	var config_content = document.createElement("div");
       
        configAlternative.appendChild(config_content);
        
        headerrow = document.createElement("div");
        config_content.appendChild(headerrow);
        
        var row = document.createElement("div");
	
	var title = document.createElement("span");
	title.appendChild(document.createTextNode("SETTINGS"));
	
	row.appendChild(title);
	row.appendChild(this._createHeaderButton("images/save.png", "Save", EzWebExt.bind(function() { 
		if (
			this.form_config &&
			this.form_config["path"].getValue() != "" &&
			this.form_config["url"].getValue() != ""){
		
			this.saveForm();
			this.reload();
		}
		else {
			this.alert("Error", "Must fill all form fields", {type: EzWebExt.ALERT_WARNING});
		}
	}, this)));

       	headerrow.appendChild(row);
       
       	tablebody = document.createElement("div");
       	config_content.appendChild(tablebody);
	
       	var config_body = document.createElement("div");
	tablebody.appendChild(config_body);  
        
       	this.form_config = {};

	var path_text = new StyledElements.StyledTextField();
	var url_text = new StyledElements.StyledTextField();
	
	this.form_config["path"] = path_text;
	this.form_config["url"] = url_text;

       	row = document.createElement("div");
	row.appendChild(this._createCell(document.createTextNode("Path" + ":"), "title"));
	row.appendChild(this._createCell(path_text, "value"));
	if (this.is_configured) {
		this.form_config["path"].setValue(this.path);
	}
	config_body.appendChild(row);
	
	row = document.createElement("div");
	row.appendChild(this._createCell(document.createTextNode("Url" + ":"), "title"));
	row.appendChild(this._createCell(url_text, "value"));
	if (this.is_configured) {
		this.form_config["url"].setValue(this.url);
	}
	config_body.appendChild(row);

	// If there are Saved settings, load Commits Alternative, else, it displays the configuration alternative.

	if(this.is_configured) {
			
		this.getBranches(this.url, this.path);

	}

	this.alternatives.insertInto(content);


}


repository.prototype._createHeaderButton = function(src, title, handler) {
	var div = document.createElement("div");
	EzWebExt.addClassName(div, "image");
	
	var img = document.createElement("img");
	img.src = this.getResourceURL(src);
	img.title = title;
	img.addEventListener("click", handler, false);
	div.appendChild(img);

	return div
}



repository.prototype.getBranches = function (url, path) {

	this.sendGet(url+"?path="+path+"&op=1", this.displayBranches, this.displayErrorBranches, this.displayExceptionBranches);

}


repository.prototype.getCommits = function (url, path, page) {


	this.sendGet(url+"?path="+path+"&op=2"+"&branch="+this.active_branch[1]+"&page="+page,
			this.displayCommits,
			this.displayErrorCommits,
			this.displayExceptionCommits);


}


repository.prototype.displayBranches = function(resp) {


	var resp_json = eval('(' + resp.responseText + ')');

	var active_branch = resp_json.active_branch;

	// clear old data

	this.branches = [];
	this.active_branch = [];

	for (i=0;i<resp_json.branches;i++) {

		this.branches[i] = [i, resp_json[i+1]];
		if (active_branch == resp_json[i+1])
		{
			this.active_branch[0] = i;
			this.active_branch[1] = active_branch;
		}

	}


	if (this.first_load == false) {

		this.select_branch.clear();
		this.select_branch.addEntries(this.branches);
		this.select_branch.setValue(this.active_branch[0]);

	}
	else {

		this.select_branch = new StyledElements.StyledSelect({initialEntries: this.branches, initialValue: this.active_branch[0]});
		this.select_branch.addEventListener('change', this.change_branch);

		this.select_branch.id = "select";

		this.select_branch.wrapperElement.style.cssFloat = 'right';

		this.select_branch.insertInto(document.getElementById('select_wrapper'));

		this.first_load = false;	
	}

	this.getCommits(this.url, this.path, this.page);

}

repository.prototype.change_branch = function(select) {

	// Ahora hay que cambiar la branch, es decir, active_branch = a la que toca y llamar a los commits, listo.

	repository.active_branch[0] = select.getValue();
	repository.active_branch[1] = repository.branches[repository.active_branch[0]][1];  // este es el nombre de la branch

	repository.page = 0;  			// Reiniciar las páginas...
	repository.pagant_enabled = false;
	repository.pagsig_enabled = true;

	repository.getCommits(repository.url, repository.path, repository.page);

}

repository.prototype.displayCommits = function(resp) {

	var resp_json = eval('(' + resp.responseText + ')');

	var n_commits = resp_json.commits;

// primero parsear y albergar los datos

// flag de pagina siguiente

	this.pagsig_enabled = resp_json.next_page;


	for (i=0; i<n_commits; i++) {
	
		this.lista_commits[i] = new commit(resp_json[i])

	}


// ahora pintar

	html = "";
	html += "Commits List: ";
	html += n_commits;
	html += "<ul>";


	for (i=0;i<n_commits;i++) {

		html +=	"<li>";
		html += '<a href = "javascript: repository.show_commit('+i+');" class="node">'; 
		html += this.lista_commits[i].commit_message.split('\n')[0];			// Mostrar la primera línea del mensaje del commit
		html += "</a>";
		html += "</li>";

	}

	html += "</ul>"


/*
'<a href="javascript: ' + this.obj + '.o(' + nodeId + ');" class="node">';

if (this.config.useStatusText) str += ' onmouseover=document.getElementById("s' + this.obj + nodeId +'").style.cursor="pointer"; onmouseout=document.getElementById("s' + this.obj + nodeId +'").style.cursor="auto" ;';

*/


	var content_left = document.createElement("div");
	content_left.id = "content_left";
	
	var content_commits = document.createElement("div");
	content_commits.id = "content_commits";
	content_left.appendChild(content_commits);

	content_commits.innerHTML = html;

	var content_pagination = document.createElement("div");
	content_pagination.id = "content_pagination";
	content_left.appendChild(content_pagination);

	// Add buttons here


	var button_pagant = document.createElement("button");
	button_pagant.id = "button_pagant";
	button_pagant.addEventListener("click", this.prev_commit, false);
	button_pagant.innerHTML = "Anterior";

	if (this.pagant_enabled == false) {

		button_pagant.disabled = true;

	}

	var button_pagsig = document.createElement("button");
	button_pagsig.id = "button_pagsig";
	button_pagsig.addEventListener("click", this.next_commit, false);
	button_pagsig.innerHTML = "Siguiente";
	
	if (this.pagsig_enabled == false) {

		button_pagsig.disabled = true;

	}

//    	var button_pagant = new StyledElements.StyledButton({text: 'Anterior'});
//    	var button_pagsig = new StyledElements.StyledButton({text: 'Siguiente'});

	button_pagant.style.cssFloat = 'left';
	button_pagsig.style.cssFloat = 'right';

/*	var prev_commit = function() {
		this.page -= 1;
		this.getCommits(this.url, this.path, this.page);
	};

	var next_commit = function(button) {
		this.page += 1;
		this.getCommits(this.url, this.path, this.page);
	};

	button_pagant.addEventListener('click', prev_commit);
	button_pagsig.addEventListener('click', next_commit);
*/

	content_pagination.appendChild(button_pagant);
	content_pagination.appendChild(button_pagsig);
	
	var content_right = document.createElement("div");
	content_right.id = "content_right";

	this.hpaned.getLeftPanel().appendChild(content_left);
	this.hpaned.getRightPanel().appendChild(content_right);
}

repository.prototype.prev_commit = function() {

	repository.page -= 1;
	if (repository.page == 0) {
		repository.pagant_enabled = false;
		document.getElementById("button_pagant").disabled = true;
	}
	repository.getCommits(repository.url, repository.path, repository.page);

}

repository.prototype.next_commit = function() {

	repository.page += 1;
	if (repository.page != 0) {
		repository.pagant_enabled = true;
		document.getElementById("button_pagant").disabled = false;
	}
	repository.getCommits(repository.url, repository.path, repository.page);

}

repository.prototype.show_commit = function(commit) {


	var html;
	var content_right = document.createElement("div");
	content_right.id = "content_right";


	html = "";
	html += "Atributos commit: ";

	html += "<ul>";

	html +=	"<li>";
	html += "<b>Commit ID:</b> " + this.lista_commits[commit].id;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Tree ID:</b> " + this.lista_commits[commit].tree;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Nombre Autor:</b> " + this.lista_commits[commit].author_name;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Email Autor:</b> " + this.lista_commits[commit].author_email;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Fecha creación:</b> " + this.lista_commits[commit].authored_date;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Nombre Committer:</b> " + this.lista_commits[commit].committer_name;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Email Committer:</b> " + this.lista_commits[commit].committer_email;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Fecha commit:</b> " + this.lista_commits[commit].committed_date;
	html += "</li>";

	html +=	"<li>";
	html += "<b>Mensaje commit:</b> " + this.lista_commits[commit].commit_message;
	html += "</li>";

	html += "</ul>"

	content_right.innerHTML = html;


	// Enviamos el árbol al gadget de tree

	this.send_tree(commit);

	this.hpaned.getRightPanel().appendChild(content_right);

}


repository.prototype.displayErrorBranches = function(n_error) {

	this.alert("Error Branches", "No se puede acceder al repositorio", EzWebExt.ALERT_ERROR);
		
}


repository.prototype.displayExceptionBranches = function(n_exception) {

	this.alert("Exception Branches", "Error inesperado", EzWebExt.ALERT_ERROR);

}


repository.prototype.displayErrorCommits = function(n_error) {

	
	this.alert("Error Commits", "No se puede acceder al repositorio", EzWebExt.ALERT_ERROR);

	
}

repository.prototype.displayExceptionCommits = function(n_exception) {

	this.alert("Exception Commits", "Error inesperado", EzWebExt.ALERT_ERROR);

	
}


repository.prototype.repaint = function() {
	var height = (document.defaultView.innerHeight - document.getElementById('header').offsetHeight);
	document.getElementById('content').style.height = height + 'px';
	this.alternatives.repaint();
	this.hpaned.repaint();

}

repository.prototype.reload = function () {

	if(this.is_configured) {
		this.alternatives.showAlternative(this.MAIN_ALTERNATIVE);
	}
	else {
		this.alternatives.showAlternative(this.CONFIG_ALTERNATIVE);
	}

	this.repaint;

}


repository.prototype._createCell = function(element, className) {
	var cell = document.createElement("div");
	var span = document.createElement("span");
	if (element instanceof StyledElements.StyledElement) {
		element.insertInto(span);
	}
	else {
		span.appendChild(element);
	}
	cell.appendChild(span);
	return cell;
}


repository.prototype.saveForm = function() {
	this.path = this.form_config["path"].getValue();
	this.url = this.form_config["url"].getValue();
	this.is_configured = true;
	this.save();
	this.getBranches(this.url, this.path);
}


repository.prototype.save = function() {

	this.saved_path.set(this.path);
	this.saved_url.set(this.url);
	
}

repository.prototype.restore = function() {

	if(this.saved_path.get()!="") {

		this.path = this.saved_path.get();
		this.url = this.saved_url.get();
		this.is_configured = true;

	}

}



repository.prototype.send_tree = function(commit) {

	this.eventPath.set(this.saved_path.get());
	this.eventUrl.set(this.saved_url.get());
	this.eventTree.set(this.lista_commits[commit].tree);


}



/* Instanciate the Gadget class */
repository = new repository();









// Contenedor de los datos de un commit

commit = function(resp_json) {

	this.id = resp_json[0];
	this.tree = resp_json[1];
	this.author_name = resp_json[2];
	this.autor_email = resp_json[3];
	this.authored_date = resp_json[4];
	this.committer_name = resp_json[5];
	this.committer_email = resp_json[6];
	this.committed_date = resp_json[7];
	this.commit_message = resp_json[8];


}

