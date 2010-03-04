/////////////////////////////////////////////
//////////// Class repository ///////////////
/////////////////////////////////////////////


/* To Do

* Primero display branches (botones?). Al seleccionar Branch, pedir commits (en servidor) (por default hace la master)

Por ahora lo mejor será hacerlo por fecha. Currar algoritmo que recorre el árbol, compara las fechas y devuelve los datos del commit, ordenados de más reciente a más antiguo (10). Pensarlo para N. Luego habrá que ver el tema de las branches y merges

* Convertir la lista de commits en botones y que tengan un texto mas representativo.

* Al pinchar en cada commit, mostramos en el recuadro de la derecha la información del commit y enviamos el id del árbol al gadget de árbol.

*/


var git_repository = function() {
	/* Call to the parent constructor */
	EzWebGadget.call(this, {translatable: false});
}

git_repository.prototype = new EzWebGadget(); /* Extend from EzWebGadget */
git_repository.prototype.resourcesURL = "http://localhost/gadgets/repository-commits/";

/******************** OVERWRITE METHODS **************************/
git_repository.prototype.init = function() {

	// Initialize EzWeb variables

       	this.form_config = {};

	this.github_radio = "";
	this.github = false;

	this.changed_repo = true;		// Esto es para mandar el árbol a repository-tree, cuando se cambia de repo (SaveForm)

	this.repository = [];							// Name of the repository on the remote machine
	this.user = "";				// Si github es cierto hace falta, lo mandamos junto a repository en event user:repo
	this.url = "";								// URL to REST API
	this.is_configured = false;						// True if Repository and URL are set, false otherwise

	this.lista_commits = [];						// Lista de commits a mostrar
	this.branches = []; 		// Branches del repositorio
	this.active_branch = [];

	this.page = 0;			// Página actual del repositorio (de 10 en 10)
	this.pagant_enabled = false;
	this.pagsig_enabled = true;

	this.first_load = true;		// Primera carga del gadget
	
	this.select_branch;		// Select Branch
	this.select_repository;		// Select Repository
	this.lista_repos = [];


	this.eventRepository = EzWebAPI.createRWGadgetVariable("eventRepository");		// Send Repository name to other gadgets
	this.eventUrl = EzWebAPI.createRWGadgetVariable("eventUrl");		// Send "URL" to other gadgets
	this.eventTree = EzWebAPI.createRWGadgetVariable("eventTree");		// Send a commit's tree SHA1 key to other gadgets.
	this.eventgithub = EzWebAPI.createRWGadgetVariable("eventgithub");	// Send whether or not use github

	this.saved_repository = EzWebAPI.createRWGadgetVariable("saved_repository");	// Saved property Repository name
	this.saved_url = EzWebAPI.createRWGadgetVariable("saved_url");		// Saved property URL
	this.saved_github = EzWebAPI.createRWGadgetVariable("saved_github");		// Saved property github

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


git_repository.prototype._createUserInterface = function() {

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
		document.getElementById('select_wrapper').style.visibility = 'visible'; 
		this.alternatives.showAlternative(this.MAIN_ALTERNATIVE);
		this.reload();
	}, this)));
	header_left.appendChild(this._createHeaderButton("images/config.png", "Settings", EzWebExt.bind(function() { 
		document.getElementById('select_wrapper').style.visibility = 'hidden'; 
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
			this.form_config["url"].getValue() != ""){
			document.getElementById('select_wrapper').style.visibility = 'visible'; 
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
        
//	var repository_text = new StyledElements.StyledTextField();                ///////////////// CONVERTIR ESTO A UN SELECT


	var url_text = new StyledElements.StyledTextField();
	
//	this.form_config["repository"] = this.select_repository.getValue();				// ASIGNAR EL VALOR DEL SELECT, QUE PUTADA PORQ EL SELECT ES ACCESO A API!!

	this.form_config["url"] = url_text;

       	row = document.createElement("div");
	row.appendChild(this._createCell(document.createTextNode("Repository: "), "title"));

// SELECT DEL CONFIG

	var select_repos = document.createElement("div");
	select_repos.id = "select_repos";
	row.appendChild(select_repos);


	config_body.appendChild(row);
	
	row = document.createElement("div");
	row.appendChild(this._createCell(document.createTextNode("Url" + ":"), "title"));
	row.appendChild(this._createCell(url_text, "value"));
	if (this.is_configured) {
		this.form_config["url"].setValue(this.url);
	}
	config_body.appendChild(row);

  /* Radio button */

	var radiobutton;

	this.github_radio = new StyledElements.ButtonsGroup('radio');
	radiobutton = new StyledElements.StyledRadioButton(this.github_radio, 'yes');
	radiobutton.insertInto(config_body);
	radiobutton = new StyledElements.StyledRadioButton(this.github_radio, 'no', {initiallyChecked: true});
	radiobutton.insertInto(config_body);

//	github_radio.addEventListener('change', this.github_change);

	// If there are Saved settings, load Commits Alternative, else, it displays the configuration alternative.

	if ((this.first_load) && (this.is_configured)) {

		this.getRepositories(this.url);

	}



	if(this.is_configured) {
			
		this.getBranches(this.url, this.repository);

	}

	this.alternatives.insertInto(content);


}

git_repository.prototype.github_change = function(radio) {

        var text = '';
        var value = radio.getValue();
	
        if (value == 'yes') {
		this.github = true;
	}
	else {
		this.github = false;
	}


}

git_repository.prototype._createHeaderButton = function(src, title, handler) {
	var div = document.createElement("div");
	EzWebExt.addClassName(div, "image");
	
	var img = document.createElement("img");
	img.src = this.getResourceURL(src);
	img.title = title;
	img.addEventListener("click", handler, false);
	div.appendChild(img);

	return div
}

git_repository.prototype.getRepositories = function (url) {

	this.sendGet(url+"?github=0&op=0", this.displayRepos, this.displayErrorRepos, this.displayExceptionRepos);

}

git_repository.prototype.getBranches = function (url, repository) {

	if (this.github) {
		this.sendGet(url+"?github=1&repository="+repository[1]+"&op=1", this.displayBranches, this.displayErrorBranches, this.displayExceptionBranches);
	}
	else {
		this.sendGet(url+"?github=0&repository="+repository[1]+"&op=1", this.displayBranches, this.displayErrorBranches, this.displayExceptionBranches);

	}	

}


git_repository.prototype.getCommits = function (url, repository, page) {

	if (this.github) {

		this.sendGet(url+"?github=1&repository="+repository[1]+"&op=2"+"&branch="+this.active_branch[1]+"&page="+page,
				this.displayCommits,
				this.displayErrorCommits,
				this.displayExceptionCommits);
	}
	else {

		this.sendGet(url+"?github=0&repository="+repository[1]+"&op=2"+"&branch="+this.active_branch[1]+"&page="+page,
				this.displayCommits,
				this.displayErrorCommits,
				this.displayExceptionCommits);
	}

}

git_repository.prototype.displayRepos = function(resp) {

	var resp_json = eval('(' + resp.responseText + ')');

	for (i=0; i<resp_json.length; i++) {

		this.lista_repos[i] = [i, resp_json[i]];

		if (this.repository[1] == resp_json[i]) {
			this.repository[0] = i;
		}

	}


	this.select_repository = new StyledElements.StyledSelect({initialEntries: this.lista_repos, initialValue: this.repository[0]});
	this.select_repository.addEventListener('change', this.change_repository);

	this.select_repository.id = "select";

//	this.select_repository.wrapperElement.style.cssFloat = 'right';

	this.select_repository.insertInto(document.getElementById('select_repos'));

//	this.first_load = false;

}

git_repository.prototype.displayBranches = function(resp) {


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

	this.getCommits(this.url, this.repository, this.page);

}

git_repository.prototype.change_branch = function(select) {

	// Ahora hay que cambiar la branch, es decir, active_branch = a la que toca y llamar a los commits, listo.

	git_repository.active_branch[0] = select.getValue();
	git_repository.active_branch[1] = git_repository.branches[git_repository.active_branch[0]][1];  // este es el nombre de la branch

	git_repository.page = 0;  			// Reiniciar las páginas...
	git_repository.pagant_enabled = false;
	git_repository.pagsig_enabled = true;

	git_repository.getCommits(git_repository.url, git_repository.repository, git_repository.page);

}

git_repository.prototype.change_repository = function(select) {


	git_repository.form_config["repository_index"] = select.getValue();
	git_repository.form_config["repository"] = git_repository.lista_repos[git_repository.form_config["repository_index"]][1];

//	git_repository.getBranches(git_repository.url, git_repository.repository, git_repository.page);

/*
	git_repository.active_branch[0] = select.getValue();
	git_repository.active_branch[1] = git_repository.branches[git_repository.active_branch[0]][1];  // este es el nombre de la branch

	git_repository.page = 0;  			// Reiniciar las páginas...
	git_repository.pagant_enabled = false;
	git_repository.pagsig_enabled = true;

	git_repository.getCommits(git_repository.url, git_repository.repository, git_repository.page);
*/
}

git_repository.prototype.displayCommits = function(resp) {

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
		html += '<a href = "javascript: git_repository.show_commit('+i+');" class="node">'; 
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

	button_pagant.style.cssFloat = 'left';
	button_pagsig.style.cssFloat = 'right';

	content_pagination.appendChild(button_pagant);
	content_pagination.appendChild(button_pagsig);
	
	var content_right = document.createElement("div");
	content_right.id = "content_right";

	this.hpaned.getLeftPanel().appendChild(content_left);
	this.hpaned.getRightPanel().appendChild(content_right);

	if (this.changed_repo == true) {
		this.send_tree(0);			// Mandamos que se cargue el árbol si acabo de cambiar de repositorio
		this.changed_repo = false;
	}
}

git_repository.prototype.prev_commit = function() {

	git_repository.page -= 1;
	if (git_repository.page == 0) {
		git_repository.pagant_enabled = false;
		document.getElementById("button_pagant").disabled = true;
	}
	git_repository.getCommits(git_repository.url, git_repository.repository, git_repository.page);

}

git_repository.prototype.next_commit = function() {

	git_repository.page += 1;
	if (git_repository.page != 0) {
		git_repository.pagant_enabled = true;
		document.getElementById("button_pagant").disabled = false;
	}
	git_repository.getCommits(git_repository.url, git_repository.repository, git_repository.page);

}

git_repository.prototype.show_commit = function(commit) {


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


git_repository.prototype.displayErrorBranches = function(n_error) {

	this.alert("Error Branches", "No se puede acceder al repositorio: "+ n_error, EzWebExt.ALERT_ERROR);
		
}


git_repository.prototype.displayExceptionBranches = function(n_exception) {

	this.alert("Exception Branches", "Error inesperado: "+ n_exception, EzWebExt.ALERT_ERROR);

}


git_repository.prototype.displayErrorCommits = function(n_error) {

	
	this.alert("Error Commits", "No se puede acceder al repositorio: "+ n_error, EzWebExt.ALERT_ERROR);

	
}

git_repository.prototype.displayExceptionCommits = function(n_exception) {

	this.alert("Exception Commits", "Error inesperado: "+ n_exception, EzWebExt.ALERT_ERROR);

	
}



git_repository.prototype.displayErrorRepos = function(n_error) {

	
	this.alert("Error Repos", "No se puede acceder al repositorio: " + n_error, EzWebExt.ALERT_ERROR);

	
}

git_repository.prototype.displayExceptionRepos = function(n_exception) {

	this.alert("Exception Repos", "Error inesperado: " + n_exception, EzWebExt.ALERT_ERROR);

	
}


git_repository.prototype.repaint = function() {
	var height = (document.defaultView.innerHeight - document.getElementById('header').offsetHeight);
	document.getElementById('content').style.height = height + 'px';
	this.alternatives.repaint();
	this.hpaned.repaint();

}

git_repository.prototype.reload = function () {

	if(this.is_configured) {
		this.alternatives.showAlternative(this.MAIN_ALTERNATIVE);
	}
	else {
		this.alternatives.showAlternative(this.CONFIG_ALTERNATIVE);
	}

	this.repaint;

}


git_repository.prototype._createCell = function(element, className) {
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


git_repository.prototype.saveForm = function() {
	this.repository[0] = this.form_config["repository_index"];
	this.repository[1] = this.form_config["repository"];
	this.github_change(this.github_radio)
	this.url = this.form_config["url"].getValue();
	this.page = 0; 
	this.pagant_enabled = false;
	this.is_configured = true;
	this.save();
	this.changed_repo = true;
	this.getBranches(this.url, this.repository);
}


git_repository.prototype.save = function() {

	this.saved_repository.set(this.repository[1]);
	this.saved_url.set(this.url);
	this.saved_github.set(this.github);
	
}

git_repository.prototype.restore = function() {

	if(this.saved_repository.get()!="") {

		this.github = this.saved_github.get();
		this.repository[1] = this.saved_repository.get();
		this.url = this.saved_url.get();
		this.is_configured = true;

	}

}



git_repository.prototype.send_tree = function(commit) {

	this.eventRepository.set(this.repository[1]);			// ?? porque no coger los this.repository, this.url, etc?
	this.eventUrl.set(this.url);
	this.eventTree.set(this.lista_commits[commit].tree);
	this.eventgithub.set(this.github);


}



/* Instanciate the Gadget class */
git_repository = new git_repository();









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

