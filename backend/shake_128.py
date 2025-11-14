import hashlib
import hmac # Para comparación segura

def hash_shake128(data):
    # Convertimos los datos a bytes
    data_bytes = data.encode('utf-8')

    # Creamos el hasher SHAKE128
    hasher = hashlib.shake_128()
    
    # Añadimos la contraseña al hash
    hasher.update(data_bytes)
    
    # Obtenemos un hash de 64 bytes
    digest = hasher.digest(64)
    
    return digest

def verify_hash(login_data, stored_hash):
    # Calculamos el hash de la contraseña ingresada
    login_hash = hash_shake128(login_data)
    
    # Comparamos los hashes de forma segura
    return hmac.compare_digest(login_hash, stored_hash)
    
def verify_login(username_login, password_login, username_database = None, password_database = None):
    ## username_database y password_database son recuperados de la base de datos
    ## Si los datos no fueron encontrados se niega el acceso en el segundo if

    if username_database == None:
        ### Usuario no encontrado
        return False
    
    username_database = hash_shake128(username_database) ## Para la comparaciòn entre hashes
    
    # Intento de inicio de sesión
    valid_username = verify_hash(username_login, username_database) ## username_database en esta parte es recuperado desde la base de datos
    valid_password = verify_hash(password_login, password_database) ## password_database en esta parte es recuperado desde la base de datos

    if valid_username and valid_password:
        ### Se concede el acceso
        return True
    else:
        ## Usuario o contraseña invalidos
        return False

# --- Ejemplo de uso ---
if __name__ == "__main__":
    username = "tista" ### Generado en el registro de usuario nuevo
    password_user = "123456" ### Generado en el registro de usuario nuevo
    
    password_login = "123456" ### Generado en el login
    username_login = "tista" ## Generado en el login
    
    # Registro de usuario nuevo
    username_database = username
    password_database = hash_shake128(password_user) 
    ### ^^^ Subir datos de usuario a la base de datos ^^^

    print(f'Acceso concedido: {verify_login(username_login, password_login, username_database, password_database)}')
