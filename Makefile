# CreditCrew AI — handover helpers.
DATE ?= $(shell date +%Y%m%d)
ZIP  ?= creditcrew-idbi-handover-$(DATE).zip
DEST ?= /mnt/documents

.PHONY: zip clean help

help:
	@echo "make zip   — bundle terraform/, docker/, .github/, docs/ into $(DEST)/$(ZIP)"
	@echo "make clean — remove local zip artefacts"

zip:
	@mkdir -p $(DEST)
	@rm -f $(DEST)/$(ZIP)
	@zip -r $(DEST)/$(ZIP) \
		terraform \
		docker \
		.github/workflows/deploy.yml \
		docs \
		README.md 2>/dev/null || true
	@echo "Wrote $(DEST)/$(ZIP)"

clean:
	@rm -f $(DEST)/creditcrew-idbi-handover-*.zip
