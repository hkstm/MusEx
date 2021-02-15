class Track:
    def __init__(self, attr_dict):
        self.attr_dict = attr_dict
        
    def __str__(self):
        return f"Artists: {', '.join(self.attr_dict['artists'])} --- Name: {self.attr_dict['name']} --- Id: {self.attr_dict['id']}"
