
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


