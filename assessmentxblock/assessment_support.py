from xmodule.library_tools import LibraryToolsService

class AssesmentLibraryToolService():

    #service =LibraryToolsService()

    def librarydetail(self,dest_block,library_key,problem_list,user_id):
        source_blocks = []
        if library_key:
            library=service._get_library(library_key)
            if library:
                for problem_id in problem_list :
                    for child in library.children:
                         if child.block_id == problem_id:
                             source_blocks.append(child)
                             break
                version = None
                with self.store.bulk_operations(dest_block.location.course_key):
                    dest_block.source_library_version = unicode(library.location.library_key.version_guid)
                    self.store.update_item(dest_block, user_id)
                    head_validation = not version
                    dest_block.children = self.store.copy_from_template(
                        source_blocks, dest_block.location, None, head_validation=True
                    )

    def list_available_problems(self,library_key):
        """
        List all known problems.
        Returns tuples of (ProblemLocator, display_name)
        """
        source_blocks=[]
        library = self._get_library(library_key)
        if library:
            #source_blocks.extend(library.children)
            for child in library.children:
                childitem=self.store.get_item(child)
                #test=set([(c.block_type, c.block_id) for c in children])
                source_blocks.extend([{"display_name": childitem.display_name , "value": child.block_id } ])
        return source_blocks


    def problems_dict(self,library_key):
        """
        List all known problems.
        Returns tuples of (ProblemLocator, display_name)
        """
        source_blocks={}
        library = self._get_library(library_key)
        if library:

            for child in library.children:
                childitem=self.store.get_item(child)

                source_blocks[child.block_id] = childitem.display_name
        return source_blocks