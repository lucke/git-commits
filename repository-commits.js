/////////////////////////////////////////////
//////////// Class repository ///////////////
/////////////////////////////////////////////

var git_repository = function() {
	/* Call to the parent constructor */
	EzWebGadget.call(this, {translatable: false});
}

git_repository.prototype = new EzWebGadget(); /* Extend from EzWebGadget */
git_repository.prototype.resourcesURL = "http://localhost/gadgets/repository-commits/";

/******************** OVERWRITE METHODS **************************/
git_repository.prototype.init = function() {

	// Initialize EzWeb variables

	this.lock = false;			// Sync variable for the API calls.

       	this.form_config = {};

	this.n_commits = 0;

	this.github_radio = "";
	this.github = false;			// False = local access; true = github access;

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
	if (this.is_configured)
	{
		this.getBranches(this.url, this.repository[1]);
	}
}


git_repository.prototype._createUserInterface = function() {

	var body = document.getElementsByTagName("body")[0];

	// Loading screen

	var loading_background = document.createElement("div");
	loading_background.id = "loading_background";
	loading_background.style.visibility = "hidden";
	body.appendChild(loading_background);

	var loading = document.createElement("div");
	loading.id = "loading";
	loading.style.visibility = "hidden";
	body.appendChild(loading);

	var loading_wrapper = document.createElement("div");
	var loading_text = document.createElement("div");
	var loading_img = document.createElement("div");
	loading_wrapper.id = "loading_wrapper";
	loading_text.id = "loading_text";
	loading_img.id = "loading_img";

	loading.appendChild(loading_wrapper);

	loading_wrapper.appendChild(loading_text);
	loading_wrapper.appendChild(loading_img);

	loading_text.innerHTML = "Awaiting response..."

	var loading_bar = document.createElement("div");
	EzWebExt.addClassName(loading_bar, "image");
	var img = document.createElement("img");
	img.src = this.getResourceURL("images/ajax-loader.gif");
	img.title = "loading_bar";
	loading_bar.appendChild(img);
	loading_img.appendChild(loading_bar);


	// Header Wrapper

	var header = document.createElement("div");
	header.id = "header";
	body.appendChild(header);

	// Header left (Alternative Switcher)

	var header_left = document.createElement("div");
	header_left.id = "header_left";
	header.appendChild(header_left);

	header_left.appendChild(this._createHeaderButton("images/view.png", "View Repository", EzWebExt.bind(function() { 	// Creates a button
		document.getElementById('select_wrapper').style.visibility = 'visible'; 					// Show branches selector
		document.getElementById("input_repository").style.visibility = 'hidden';
		document.getElementById("header_right_text").style.visibility = 'visible';
		this.alternatives.showAlternative(this.MAIN_ALTERNATIVE);							// Show commit alternative
		this.reload();													// Load settings and paint
	}, this)));
	header_left.appendChild(this._createHeaderButton("images/config.png", "Settings", EzWebExt.bind(function() { 		// Creates a button
		document.getElementById('select_wrapper').style.visibility = 'hidden'; 						// Hiddens branches selector
		document.getElementById("input_repository").style.visibility = 'visible';
		document.getElementById("header_right_text").style.visibility = 'hidden';
		this.alternatives.showAlternative(this.CONFIG_ALTERNATIVE);							// Show Config alternative
		this.repaint();													// Paint alternative
	}, this)));

	// Header text

	var header_left_text = document.createElement("div");
	header_left_text.id = "header_left_text";
	header_left.appendChild(header_left_text);
	header_left_text.innerHTML = "Git";

	// Header right (Branches selector)

	var header_right = document.createElement("div");
	header_right.id = "header_right";
	header.appendChild(header_right);

//	header_right.innerHTML = "Select Repository Branch: ";						// TO DO!!!!

	var select_wrapper = document.createElement("div");				// Branches selector
	select_wrapper.id = "select_wrapper";
	header_right.appendChild(select_wrapper);

	var header_right_text = document.createElement("div");
	header_right_text.id = "header_right_text";
	header_right.appendChild(header_right_text);
	header_right_text.innerHTML = "Branch:";
	header_right_text.style.visibility = 'hidden';

// ****************************************************************************************************************************** //

	// Body wrapper

	var content = document.createElement("div");
	content.id = "content";
	body.appendChild(content);
	
	// CONFIGURATION ALTERNAVITE
	// -------------------------

	// Wrappers

	var configAlternative = this.alternatives.createAlternative();

	var upper_wrapper = document.createElement("div");
	upper_wrapper.id = "upper_wrapper";

        configAlternative.appendChild(upper_wrapper);


	var lower_wrapper = document.createElement("div");
	lower_wrapper.id = "lower_wrapper";

        configAlternative.appendChild(lower_wrapper);


	var save_wrapper = document.createElement("div");
	save_wrapper.id = "save_wrapper";

        configAlternative.appendChild(save_wrapper);

	// Upper Wrapper

	// Config1 - API's URL

	var config1 = document.createElement("div");
	config1.id = "config1";

	upper_wrapper.appendChild(config1);

		var text1 = document.createElement("div");
		text1.id = "text1";
		text1.innerHTML = "<b>API's Url: </b>"

		config1.appendChild(text1);

		var input_url = document.createElement("div");
		input_url.id = "input_url";

		var url_text = new StyledElements.StyledTextField({id:"url_api"});
		this.form_config["url"] = url_text;

		if (this.is_configured)
		{
			url_text.setValue(this.url);
		}


		url_text.insertInto(input_url);

		var url_button = document.createElement("button");
		url_button.id = "TestAPI";
		url_button.innerHTML = "Accept";	
		url_button.addEventListener("click",this.accept_config1, false);

		input_url.appendChild(url_button); 

		config1.appendChild(input_url);


	// Config2 - Access Type
		
	var config2 = document.createElement("div");
	config2.id = "config2";

	upper_wrapper.appendChild(config2);

		var text2 = document.createElement("div");
		text2.id = "text2";
		text2.innerHTML = "<b>Access Type:</b>";

		config2.appendChild(text2);

		var radio1 = document.createElement("div");
		radio1.id = "div_radio1";
		config2.appendChild(radio1);

		var radiobutton;
		this.github_radio = new StyledElements.ButtonsGroup('radio');

		var check_radio1 = true;
		var check_radio2 = false;

		if ((this.is_configured) && (this.github))
		{
			check_radio1 = false;
			check_radio2 = true;
			
		}


		radiobutton = new StyledElements.StyledRadioButton(this.github_radio, 'local', {initiallyChecked: check_radio1, id: "radio1"});
		radiobutton.insertInto(radio1);

			var textradio1 = document.createElement("div");
			textradio1.id = "textradio1";
			textradio1.innerHTML = "Local Access";
			radio1.appendChild(textradio1);
		
		var radio2 = document.createElement("div");
		radio2.id = "div_radio2";
		config2.appendChild(radio2);

		radiobutton = new StyledElements.StyledRadioButton(this.github_radio, 'github', {initiallyChecked: check_radio2, id: "radio2"});
		radiobutton.insertInto(radio2);

			var textradio2 = document.createElement("div");
			textradio2.id = "textradio2";
			textradio2.innerHTML = "Github Access";
			radio2.appendChild(textradio2)

		var access_button = document.createElement("button");
		access_button.id = "button2";
		access_button.innerHTML = "Accept";
		access_button.addEventListener("click",this.accept_config2, false);

		config2.appendChild(access_button);


	// Config3 - Local Access

	var config3 = document.createElement("div");
	config3.id = "config3";

	lower_wrapper.appendChild(config3);

		var text3 = document.createElement("div");
		text3.id = "text3";
		text3.innerHTML = "<b>Local config:</b>"
		config3.appendChild(text3);

		var local_repository = document.createElement("div");
		local_repository.id = "local_repository";
		local_repository.innerHTML = "Select Repository";
		config3.appendChild(local_repository);

		// Select local repository (filled with data later)

		var input_repository = document.createElement("div");
		input_repository.id = "input_repository";	
		config3.appendChild(input_repository);

	// Config4 - Github Access

	var config4 = document.createElement("div");
	config4.id = "config4";

	lower_wrapper.appendChild(config4);

		var text4 = document.createElement("div");
		text4.id = "text4";
		text4.innerHTML = "<b>Github config:</b>"		
		config4.appendChild(text4);

		var github_user = document.createElement("div");
		github_user.id = "github_user"
		config4.appendChild(github_user);

		var user_text = document.createElement("div");
		user_text.id = "user_text";
		user_text.innerHTML = "User:";
		github_user.appendChild(user_text);
		
		var github_user_text = new StyledElements.StyledTextField({id:"user"});
		this.form_config["user"] = github_user_text;
		github_user_text.insertInto(github_user);		

		var github_repo = document.createElement("div");
		github_repo.id = "github_repo"
		config4.appendChild(github_repo);
		
		var repo_text = document.createElement("div");
		repo_text.id = "repo_text";
		repo_text.innerHTML = "Repository:";
		github_repo.appendChild(repo_text);

		var github_repo_text = new StyledElements.StyledTextField({id:"repo"});
		this.form_config["repo"] = github_repo_text;
		github_repo_text.insertInto(github_repo);

		if ((this.is_configured) && (this.github))
		{
			var user = this.repository[1].split(";")[0]
			var repo = this.repository[1].split(";")[1]
			github_user_text.setValue(user);
			github_repo_text.setValue(repo);
		}

	// Save config

	var save_config = document.createElement("div");
	save_config.id = "save_config";
	save_wrapper.appendChild(save_config);


	var save_button = document.createElement("button");
	save_button.id = "save";
	save_button.innerHTML = "Save Config";
	save_button.addEventListener("click",this.saveForm, false);

	save_config.appendChild(save_button);


	var clear_button = document.createElement("button");
	clear_button.id = "clear";
	clear_button.innerHTML = "Clear Data";
	clear_button.addEventListener("click",this.clear_config, false);

	save_config.appendChild(clear_button);


	this.alternatives.insertInto(content);

	this.disable_config2();					//Disable config2
	this.disable_config3();					//Disable config3
	this.disable_config4();					//Disable config4
	this.disable_save();					//Disable save button

}

///////////////////////////////////////////////////////// Button behaviour

git_repository.prototype.accept_config1 = function () {

	// This function grabs the info from "url_text" and does the following:
	//		1) Check that the text input is not empty
	//			- if it's empty, error message.
	//			- if it's not empty, go to 2.
	//		2) Check if the API's URL inserted is online by sending a GET.

	var url = git_repository.form_config["url"].getValue();

	if (url != ""){
		git_repository.getTest(url);
	}
	else
	{
		git_repository.alert("Error", "Must fill in URL's text field", EzWebExt.ALERT_ERROR);
	}	


}


git_repository.prototype.accept_config2 = function () {

	// This function grabs the info from the acces radio buttons (local//github) and does the following:
	//		1) Check the radio buttons
	//			- if it's set to local access, go to 2.
	//			- if it's set to github access, go to 3.
	//		2) Local access:
	//			- Set the form_config[github] variable to false
	//			- enable config3 and save functions.
	//			- disable config2
	//			- Send a GET command to the API to get the local repositories.
	//		3) Github access:
	//			- Set the form_config[github] variable to true
	//			- disable config2
	//			- Enable config4 and save functions.


        var value = git_repository.github_radio.getValue();
	
        if (value == 'github') {
		git_repository.form_config["github"] = true;
		git_repository.enable_config4();
		git_repository.enable_save();
		git_repository.disable_config2();
	}
	else {
		git_repository.form_config["github"] = false;
		git_repository.enable_config3();
		git_repository.enable_save();
		git_repository.disable_config2();
		git_repository.getRepositories(git_repository.form_config["url"].getValue());
	}


}


///////////////////////////////////////////////////////// Disable Config functions

git_repository.prototype.disable_config1 = function () {

	document.getElementById("text1").style.color = "lightgray";
	document.getElementById("url_api").style.background = "lightgray";
	document.getElementById("url_api").childNodes[0].childNodes[0].style.color = "gray";
	document.getElementById("url_api").childNodes[0].childNodes[0].style.background = "lightgray";
	document.getElementById("url_api").childNodes[0].childNodes[0].disabled = true;
	document.getElementById("TestAPI").disabled = true;

}

git_repository.prototype.disable_config2 = function () {

	document.getElementById("text2").style.color = "gray";
	document.getElementById("radio1").disabled = true;
	document.getElementById("textradio1").style.color = "lightgray";
	document.getElementById("radio2").disabled = true;
	document.getElementById("textradio2").style.color = "lightgray";
	document.getElementById("button2").disabled = true;

}

git_repository.prototype.disable_config3 = function () {

	document.getElementById("text3").style.color = "gray";
	document.getElementById("local_repository").style.color = "lightgray";
	document.getElementById("input_repository").style.visibility = 'hidden';	

}

git_repository.prototype.disable_config4 = function () {

	document.getElementById("text4").style.color = "grey";
	document.getElementById("user_text").style.color = "lightgrey";
	document.getElementById("repo_text").style.color = "lightgrey";

	document.getElementById("user").style.background = "lightgray";
	document.getElementById("user").childNodes[0].childNodes[0].style.color = "gray";
	document.getElementById("user").childNodes[0].childNodes[0].style.background = "lightgray";
	document.getElementById("user").childNodes[0].childNodes[0].disabled = true;

	document.getElementById("repo").style.background = "lightgray";
	document.getElementById("repo").childNodes[0].childNodes[0].style.color = "gray";
	document.getElementById("repo").childNodes[0].childNodes[0].style.background = "lightgray";
	document.getElementById("repo").childNodes[0].childNodes[0].disabled = true;

}

git_repository.prototype.disable_save = function () {

	document.getElementById("save").disabled = true;

}

///////////////////////////////////////////////////////// Enable Config functions

git_repository.prototype.enable_config1 = function () {

	document.getElementById("text1").style.color = "black";
	document.getElementById("url_api").style.background = "white";
	document.getElementById("url_api").childNodes[0].childNodes[0].style.color = "black";
	document.getElementById("url_api").childNodes[0].childNodes[0].style.background = "white";
	document.getElementById("url_api").childNodes[0].childNodes[0].disabled = false;
	document.getElementById("TestAPI").disabled = false;

//	document.getElementById("url_api").childNodes[0].childNodes[0].disabled = "true";
//	document.getElementById("TestAPI").disabled = true;

}

git_repository.prototype.enable_config2 = function () {

	document.getElementById("text2").style.color = "black";
	document.getElementById("radio1").disabled = false;
	document.getElementById("textradio1").style.color = "black";
	document.getElementById("radio2").disabled = false;
	document.getElementById("textradio2").style.color = "black";
	document.getElementById("button2").disabled = false;

}

git_repository.prototype.enable_config3 = function () {

	document.getElementById("text3").style.color = "black";
	document.getElementById("local_repository").style.color = "black";
	document.getElementById("input_repository").style.visibility = 'visible';

}

git_repository.prototype.enable_config4 = function () {

	document.getElementById("text4").style.color = "black";
	document.getElementById("user_text").style.color = "black";
	document.getElementById("repo_text").style.color = "black";

	document.getElementById("user").style.background = "white";
	document.getElementById("user").childNodes[0].childNodes[0].style.color = "black";
	document.getElementById("user").childNodes[0].childNodes[0].style.background = "white";
	document.getElementById("user").childNodes[0].childNodes[0].disabled = false;

	document.getElementById("repo").style.background = "white";
	document.getElementById("repo").childNodes[0].childNodes[0].style.color = "black";
	document.getElementById("repo").childNodes[0].childNodes[0].style.background = "white";
	document.getElementById("repo").childNodes[0].childNodes[0].disabled = false;

}

git_repository.prototype.enable_save = function () {

	document.getElementById("save").disabled = false;

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

///////////////////////////////////////////////////////// Send GET's

git_repository.prototype.getTest = function (url) {

	this.loading(true);
	this.sendGet(url+"?op=-1&github=0", this.TestOk, this.TestFailed, this.TestFailed);

}

git_repository.prototype.getRepositories = function (url) {

	this.sendGet(url+"?github=0&op=0", this.displayRepos, this.displayErrorRepos, this.displayExceptionRepos);

}

git_repository.prototype.getBranches = function (url, repository) {

	this.loading(true);

	if (this.github) {

		var user = this.repository[1].split(';')[0];
		var repo = this.repository[1].split(';')[1];

		this.sendGet(url+"?github=1&repository="+repo+"&user="+user+"&op=1", this.displayBranches, this.displayErrorBranches, this.displayExceptionBranches);
	}
	else {
		this.sendGet(url+"?github=0&repository="+repository+"&op=1", this.displayBranches, this.displayErrorBranches, this.displayExceptionBranches);

	}	

}


git_repository.prototype.getCommits = function (url, repository, page) {

	if (this.github) {

		var user = this.repository[1].split(';')[0];
		var repo = this.repository[1].split(';')[1];

		this.sendGet(url+"?github=1&repository="+repo+"&user="+user+"&op=2"+"&branch="+this.active_branch[1],
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


///////////////////////////////////////////////////////// GET's OK responses


git_repository.prototype.TestOk = function(resp) {

	this.loading(false);

	if (resp.responseText == "OK"){
		this.disable_config1();
		this.enable_config2();
	}
	else
	{
		this.alert("Error", "The specified URL does not host a valid API", EzWebExt.ALERT_ERROR);
	}
}

git_repository.prototype.displayRepos = function(resp) {

	var resp_json = eval('(' + resp.responseText + ')');
	var indice_select = 0;


	for (i=0; i<resp_json.length; i++) {

		this.lista_repos[i] = [i, resp_json[i]];

		if (this.is_configured)
		{
			if (this.repository[1] == resp_json[i])
			{
				indice_select = i;
				this.repository[0] = i;
			}

		}

	}


	this.select_repository = new StyledElements.StyledSelect({initialEntries: this.lista_repos, initialValue: indice_select});
	this.select_repository.addEventListener('change', this.change_repository);

	this.form_config["repository_index"] = 0;				// Default values, in case user doesn't select a repo
	this.form_config["repository"] = this.lista_repos[0][1];		// "

	this.select_repository.id = "select";

//	this.select_repository.wrapperElement.style.cssFloat = 'right';




	this.select_repository.insertInto(document.getElementById('input_repository'));

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

	document.getElementById('select_wrapper').style.visibility = 'visible'; 					// Show branches selector
	document.getElementById("header_right_text").style.visibility = 'visible';
	this.getCommits(this.url, this.repository, this.page);

}

git_repository.prototype.change_branch = function(select) {

	// Ahora hay que cambiar la branch, es decir, active_branch = a la que toca y llamar a los commits, listo.

	git_repository.active_branch[0] = select.getValue();
	git_repository.active_branch[1] = git_repository.branches[git_repository.active_branch[0]][1];  // este es el nombre de la branch

	git_repository.page = 0;  			// Reiniciar las páginas...
	git_repository.pagant_enabled = false;
	git_repository.pagsig_enabled = true;

	git_repository.loading(true);
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

	this.n_commits = resp_json.commits;

// primero parsear y albergar los datos

// flag de pagina siguiente

	if (this.github) 
	{
		if ((this.page*10+10)<this.n_commits)								// Ojito con esto
		{
			this.pagsig_enabled = true;
		}
		else
		{
			this.pagsig_enabled = false;
		}
	}
	else
	{
		this.pagsig_enabled = resp_json.next_page;
	}

	if (this.github) 
	{
		for (i=1; i<=this.n_commits; i++) {
	
			this.lista_commits[i] = new commit(resp_json[i])

		}

	}
	else
	{
		for (i=0; i<this.n_commits; i++) {
	
			this.lista_commits[i] = new commit(resp_json[i])

		}
	}

// ahora pintar

	html = "";
	html += "Commits List: ";
	html += this.n_commits;
	html += "<ul>";

	if (this.github) 
	{

		for (i=1*this.page+1;i<=this.n_commits;i++) {

			html +=	"<li>";
			html += '<a href = "javascript: git_repository.show_commit('+i+');" class="node">'; 
			html += this.lista_commits[i].commit_message.split('\n')[0];			// Mostrar la primera línea del mensaje del commit
			html += "</a>";
			html += "</li>";

		}

		html += "</ul>"
	
	}
	else
	{


		for (i=0;i<this.n_commits;i++) {

			html +=	"<li>";
			html += '<a href = "javascript: git_repository.show_commit('+i+');" class="node">'; 
			html += this.lista_commits[i].commit_message.split('\n')[0];			// Mostrar la primera línea del mensaje del commit
			html += "</a>";
			html += "</li>";

		}

		html += "</ul>"

	}
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

	this.hpaned.getLeftPanel().clear();
	this.hpaned.getLeftPanel().appendChild(content_left);

	this.hpaned.getRightPanel().clear();
	this.hpaned.getRightPanel().appendChild(content_right);

	if (this.github)
	{
		if (this.changed_repo == true) {
			this.send_tree(1);			// Mandamos que se cargue el árbol si acabo de cambiar de repositorio
			this.changed_repo = false;
		}
	}
	else
	{
		if (this.changed_repo == true) {
			this.send_tree(0);			// Mandamos que se cargue el árbol si acabo de cambiar de repositorio
			this.changed_repo = false;
		}
	}

	this.loading(false);

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

	this.hpaned.getRightPanel().clear();
	this.hpaned.getRightPanel().appendChild(content_right);

}





git_repository.prototype.TestFailed = function() {

	this.loading(false);
	this.alert("Error on API's URL", "Can't acces the specified API's URL", EzWebExt.ALERT_ERROR);

}


git_repository.prototype.displayErrorBranches = function(n_error) {

	this.loading(false);
	this.alert("Error Branches", "No se puede acceder al repositorio: "+ n_error, EzWebExt.ALERT_ERROR);
		
}


git_repository.prototype.displayExceptionBranches = function(n_exception) {

	this.loading(false);
	this.alert("Exception Branches", "Error inesperado: "+ n_exception, EzWebExt.ALERT_ERROR);

}


git_repository.prototype.displayErrorCommits = function(n_error) {

	this.loading(false);	
	this.alert("Error Commits", "No se puede acceder al repositorio: "+ n_error, EzWebExt.ALERT_ERROR);

	
}

git_repository.prototype.displayExceptionCommits = function(n_exception) {

	this.loading(false);
	this.alert("Exception Commits", "Error inesperado: "+ n_exception, EzWebExt.ALERT_ERROR);

	
}



git_repository.prototype.displayErrorRepos = function(n_error) {

	this.loading(false);
	this.alert("Error Repos", "No se puede acceder al repositorio: " + n_error, EzWebExt.ALERT_ERROR);

	
}

git_repository.prototype.displayExceptionRepos = function(n_exception) {

	this.loading(false);
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
		document.getElementById("input_repository").style.visibility = 'hidden';
	}
	else {
		document.getElementById("input_repository").style.visibility = 'visible';
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

	git_repository.github = git_repository.form_config["github"];

	if (git_repository.github == false) 
	{
		git_repository.repository[0] = git_repository.form_config["repository_index"];
		git_repository.repository[1] = git_repository.form_config["repository"];

		document.getElementById("header_left_text").innerHTML = "Git - Local: "+git_repository.repository[1];

	}
	else
	{
		var user = git_repository.form_config["user"].getValue();
		var repo = git_repository.form_config["repo"].getValue();
		git_repository.repository[1] = user+";"+repo;

		document.getElementById("header_left_text").innerHTML = "Git - GitHub: "+repo;
	}

	git_repository.url = git_repository.form_config["url"].getValue();

	git_repository.page = 0;
	git_repository.pagant_enabled = false;
	git_repository.pagsig_enabled = false;
	git_repository.is_configured = true;
	git_repository.changed_repo = true;
	git_repository.save();
	git_repository.reload();
	git_repository.getBranches(git_repository.url, git_repository.repository[1]);
}

git_repository.prototype.clear_config = function () {

	git_repository.enable_config1();
	git_repository.disable_config2();
	git_repository.disable_config3();
	git_repository.disable_config4();

	obj = document.getElementById("input_repository");
	if (obj.childNodes.length > 0)
	{
		obj.removeChild(obj.childNodes[0]);
	}
}

git_repository.prototype.save = function() {

	this.saved_repository.set(this.repository[1]);
	this.saved_url.set(this.url);
	this.saved_github.set(this.github);
	
}

git_repository.prototype.restore = function() {

	if(this.saved_repository.get()!="") {

		if (this.saved_github.get() == "True")
		{
			this.github = true;
		}
		else
		{
			this.github = false;
		}

		this.repository[1] = this.saved_repository.get();
		this.url = this.saved_url.get();
		this.is_configured = true;

	}

}



git_repository.prototype.send_tree = function(commit) {

	this.eventRepository.set(this.repository[1]+";"+this.github);		// ?? porque no coger los this.repository, this.url, etc?
	this.eventUrl.set(this.url);
	this.eventTree.set(this.lista_commits[commit].tree);

}


git_repository.prototype.loading = function(enable) {

	if (enable)
	{

		this.lock = true;
		document.getElementById("loading").style.visibility = "visible";
		document.getElementById("loading_background").style.visibility = "visible";


	}
	else
	{

		this.lock = false;
		document.getElementById("loading").style.visibility = "hidden";
		document.getElementById("loading_background").style.visibility = "hidden";


	}


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

