# Wat je zelf moet kunnen uitleggen

**Wat was kapot?** Een functie accepteerde een stopsignaal maar gebruikte het niet. De echte lokale backend bleef schrijven en kon succes melden na annulering.

**Waarom is de oplossing klein?** De bestaande Node-pipeline kan streams annuleren. We geven het al aanwezige signaal door en hergebruiken de bestaande opruiming. Geen eigen scheduler of cancellation-framework nodig.

**Waarom is een bestand niet meteen definitief?** Uploads schrijven eerst naar een tijdelijk bestand. Na succesvolle ontvangst en metadata wordt het hernoemd. Daardoor hoeft een mislukte overdracht het bestaande bestand niet te vervangen.

**Wanneer mag een annulering niet meer ingrijpen?** Na het ontvangen van de volledige body laat de bestaande uploader de afronding doorgaan. Onze fix respecteert die grens.

**Hoe weten we dat de test klopt?** Twee nieuwe tests falen op de oorspronkelijke productiecode en slagen met de fix. Een tweede reproductie gebruikt echte bestanden en metadata, zonder mocks. Daarbij is ook een fout in de eerste testopzet gevonden en gecorrigeerd.

**Wat kunnen we niet claimen?** Geen bewezen fout in Supabase Cloud, geen aantoonbaar HTTP-dataverlies, geen gemeten performancewinst en geen geaccepteerde PR zolang maintainers die niet hebben gemerged.

**Wat zou een maintainer nog kunnen vragen?** Of de foutcode en grens bij body-completion gewenst zijn, of er andere interne callers bestaan en of aanvullende integratiedekking nodig is. Verwijs naar concrete code en resultaten; gok niet.
