SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=stash.safariextension/lib/%.js)

lib: $(LIB)
stash.safariextension/lib/%.js: src/%.js
	mkdir -p $(@D)
	babel $< -o $@
