all:
.SILENT:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

clean:;rm -rf mid out

# For 'make serve'
export INTF:=localhost
export PORT:=8080

ifeq (,$(shell which jspp))
  serve:;HTDOCS=$(shell realpath src/www) node src/server/main.js
else

  #TODO jspp needs to add the "source-map" annotation, I think Firefox requires it
  WWWSRCFILES:=$(shell find src/www -type f)
  JSSRCFILES:=$(filter %.js,$(WWWSRCFILES))
  WWWVERBATIMFILES:=$(filter-out $(JSSRCFILES),$(WWWSRCFILES))
  JSMID:=mid/www/graffiti.js
  JSMAPMID:=mid/www/graffiti.js.map
  HTDOCS_MID:=$(JSMID) $(JSMAPMID) $(patsubst src/%,mid/%,$(WWWVERBATIMFILES))
  $(JSMID) $(JSMAPMID):$(JSSRCFILES);$(PRECMD) jspp -o$(JSMID) -m$(JSMAPMID) -psrc/www src/www
  mid/www/%:src/www/%;$(PRECMD) cp $< $@
  mid/www/index.html:src/www/index.html;$(PRECMD) sed 's,js/bootstrap\.js,graffiti.js,' $< > $@
  all:$(HTDOCS_MID)
  
  serve:$(HTDOCS_MID);HTDOCS=$(shell realpath mid/www) node src/server/main.js
endif

